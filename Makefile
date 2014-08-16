# A convenience Makefile
# Best used with bash-completion

TI=/usr/local/bin/titanium
DEVICE="iPhone Retina (4 inch)"
DEVICE_35_INCH="iPhone Retina (3.5 inch)"
DEVICE_IPAD="iPad"
DEVICE_IPAD_RETINA="iPad Retina"

.PHONY:	clean ios-simulator simulator-android build-android

clean:
	@rm -rf "`pwd`"/build/*
	@rm -rf "`pwd`"/Resources/*

pre-build:
	@echo "Doing pre build"
	# Add any pre-build scripts here

ios-simulator: pre-build
	$(TI) build --platform=ios --log-level=debug --target simulator --device-id $(DEVICE)

ios-simulator-35inch: pre-build
	$(TI) build --platform=ios --log-level=debug --target simulator --device-id $(DEVICE_35_INCH)

ios-simulator-ipad: pre-build
	$(TI) build --platform=ios --log-level=debug --target simulator --device-id $(DEVICE_IPAD)

ios-simulator-ipad-ret: pre-build
	$(TI) build --platform=ios --log-level=debug --target simulator --device-id $(DEVICE_IPAD_RETINA)

ios-simulator-rapiddev: pre-build
	$(TI) build --platform=ios --log-level=debug --target simulator --device-id $(DEVICE) --rapiddev

ios-simulator-shadow: pre-build
	$(TI) build --platform=ios --log-level=debug --target simulator --device-id $(DEVICE) --shadow	

ios-simulator-test: pre-build
	$(TI) build --platform=ios --log-level=debug --target simulator -D test --device-id $(DEVICE)

android-simulator: pre-build
	$(TI) build --platform=android --log-level=debug

android-device:	pre-build
	$(TI) build --platform=android --log-level=debug --target=device

android-geny-s5device:	pre-build
	$(TI) build --platform=android --log-level=debug --device-id "Samsung Galaxy S5 - 4.4.2 - API 19 - 1080x1920"

