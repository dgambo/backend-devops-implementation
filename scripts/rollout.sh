#!/bin/bash

set -euxo pipefail

AVAILABLE_COMMANDS="api"

AWS_ENVIRONMENT=$(echo ${AWS_ENVIRONMENT:0:1} | tr  '[a-z]' '[A-Z]')${AWS_ENVIRONMENT:1}

usage() {
    cat <<EOF
Usage: [COMMAND] [-h] [-v] ...

Rollout a new version of the application.

Available commands:

api                 Rollout API (Application Service)

Available options:

-h, --help          Print this help and exit
-e, --environment   Environment to rollout to (one of: dev, stg, production)
-t, --tag           Tag to rollout (default: latest)
-r, --registry      ECR registry to use
EOF
}

die() {
    local msg=$1
    local code=${2-1} # default exit status 1
    msg "$msg"
    exit "$code"
}

msg() {
    echo >&2 -e "${1-}"
}

taskdef::register() {
    # Remove unknown parameter inputs.

    __drop_parameter_input=(
        ".compatibilities"
        ".revision"
        ".registeredAt"
        ".registeredBy"
        ".requiresAttributes"
        ".status"
        ".taskDefinitionArn"
    )
    for param in ${__drop_parameter_input[@]}; do
        yq -iP -o json "del($param)" ${1:-task-definition.json}
    done

    # Register new task definition.

    aws ecs register-task-definition \
        --cli-input-json file://task-definition.json \
        --query taskDefinition.taskDefinitionArn \
        --output text
}

rollout::api() {
    : "${AWS_ENVIRONMENT:?AWS_ENVIRONMENT must be set}"
    : "${TAG:?TAG must be set}"
    : "${ECR_CONTAINER_REGISTRY:?ECR_CONTAINER_REGISTRY must be set}"

    local arn=$(aws ssm get-parameter --name "/TaskDef/${AWS_ENVIRONMENT}StrvBackendServiceApi" --query Parameter.Value --output text)
    aws ecs describe-task-definition  \
        --task-definition "${arn%:*}" \
        --query taskDefinition \
        > task-definition.json
    msg "Rolling out AWS service"
    yq -iP -o json ".containerDefinitions[0].image = \"${ECR_CONTAINER_REGISTRY}/strv/template-backend-api:${TAG}\"" task-definition.json

    taskdef::register task-definition.json > task-definition-arn.txt

    # Update service.

    aws ecs update-service \
        --cluster "${AWS_ENVIRONMENT}StrvBackendCluster" \
        --service "${AWS_ENVIRONMENT}StrvBackendApi" \
        --task-definition "$(cat task-definition-arn.txt)" \
        --force-new-deployment
}

main() {
    while :; do
        case "${1-}" in
        -h | --help) usage && exit ;;
        -e | --environment)
            export AWS_ENVIRONMENT=$(echo ${2:0:1} | tr  '[a-z]' '[A-Z]')${2:1}
            shift
            ;;
        -r | --registry)
            export ECR_CONTAINER_REGISTRY="${2-}"
            shift
            ;;
        -t | --tag)
            export TAG="${2-}"
            shift
            ;;
        ?*)
            cmd=$1
            if [[ "$AVAILABLE_COMMANDS" =~ (.*)$cmd(.*) ]]; then
                shift && rollout::$cmd "$@"
            else
                die "Unknown command: $1"
            fi
            break
            ;;
        *) break ;;
        esac
        shift
    done

    return 0
}

main "$@"
