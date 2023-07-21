include ./Makefile.vars

# =======
# Targets
# =======

.PHONY: all
all: __aws-cdk test aws

.PHONY: aws
aws: __aws-cdk aws-cdk-synthesize

.PHONY: test
test: aws-test

# Run lint check
.PHONY: lint
lint:
	npx eslint .

.PHONY: lint-fix
# Run lint check and fix
lint-fix:
	npx eslint --fix .

.PHONY: format
# Check code formatting
format:
	npx prettier --check .

.PHONY: format-fix
# Format code
format-fix:
	npx prettier --write .

.PHONY: aws-test
aws-test:
	@npm run test

.PHONY: aws-rollout-%
aws-rollout-%: __aws-cdk
ifeq ($(TAG),)
	$(error TAG is not set)
endif
	./scripts/rollout.sh -e $(AWS_ENVIRONMENT) -r $(ECR_CONTAINER_REGISTRY) -t $(TAG) $*

.PHONY: aws-cdk-bootstrap
aws-cdk-bootstrap:
	AWS_ACCOUNT_ID="$(AWS_ACCOUNT_ID)" AWS_ENVIRONMENT=bootstrap npx aws-cdk bootstrap

.PHONY: aws-cdk-%
aws-cdk-%: DEFAULT_ARGS=-v --logs --no-lookups --all
aws-cdk-%: __aws-cdk
ifeq ($(ARGS),)
	AWS_ACCOUNT_ID="$(AWS_ACCOUNT_ID)" AWS_ENVIRONMENT="$(AWS_ENVIRONMENT)" npx aws-cdk $* $(DEFAULT_ARGS)
else
	AWS_ACCOUNT_ID="$(AWS_ACCOUNT_ID)" AWS_ENVIRONMENT="$(AWS_ENVIRONMENT)" npx aws-cdk $* $(ARGS)
endif

# Install the AWS CDK CLI.
__aws-cdk:
ifeq ($(AWS_ENVIRONMENT),production)
else ifeq ($(AWS_ENVIRONMENT),stg)
else ifeq ($(AWS_ENVIRONMENT),dev)
else ifeq ($(AWS_ENVIRONMENT),test)
else
	$(error AWS_ENVIRONMENT must one of [test, dev, stg, production])
endif
ifeq ($(shell npm list -g aws-cdk),)
	npm install -g aws-cdk
endif
