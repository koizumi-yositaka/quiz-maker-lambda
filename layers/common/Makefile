.PHONY: build
build:
	@echo "no-op: nodejs/ already contains artifacts"

# 2) LogicalId=CommonLayer に合わせる
.PHONY: build-CommonLayer
build-CommonLayer: build
	mkdir -p $(ARTIFACTS_DIR)/nodejs
	cp -R nodejs/* $(ARTIFACTS_DIR)/nodejs/

.PHONY: clean-CommonLayer
clean-CommonLayer:
	rm -rf $(ARTIFACTS_DIR)/*

.PHONY: install-CommonLayer
install-CommonLayer: build
	@echo "ok"