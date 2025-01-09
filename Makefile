VERSION := v0.0.1

cleanup:
	cd web && rm -rf dist/
	rm -rf bin/ dist/

build-web:
	cd web && pnpm i --frozen-lockfile && pnpm build

compile:
	GOOS=linux GOARCH=386 go build -ldflags "-X main.isProdBuild=y" -o bin/linux_i386/sora-recap-cuid main.go
	GOOS=linux GOARCH=amd64 go build -ldflags "-X main.isProdBuild=y" -o bin/linux_x86_64/sora-recap-cuid main.go
	GOOS=windows GOARCH=386 go build -ldflags "-X main.isProdBuild=y" -o bin/windows_i386/sora-recap-cuid.exe main.go
	GOOS=windows GOARCH=amd64 go build -ldflags "-X main.isProdBuild=y" -o bin/windows_x86_64/sora-recap-cuid.exe main.go

packs: cleanup build-web compile

release: packs
	mkdir -p dist/
	zip -rjm dist/sora-recap-cuid_$(VERSION)_linux_i386.zip bin/linux_i386/sora-recap-cuid
	zip -rjm dist/sora-recap-cuid_$(VERSION)_linux_x86_64.zip bin/linux_x86_64/sora-recap-cuid
	zip -rjm dist/sora-recap-cuid_$(VERSION)_windows_i386.zip bin/windows_i386/sora-recap-cuid.exe
	zip -rjm dist/sora-recap-cuid_$(VERSION)_windows_x86_64.zip bin/windows_x86_64/sora-recap-cuid.exe