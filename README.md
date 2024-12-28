# recap-cuid

## Development

Di root directory, cek dulu si `thin-client` ada dimana.
```sh
go run main.go list
```

Kalo dah tau abis tu
```
go run main.go start -b <ISI SESUAI LIST>
```

## Build (Sementara linux dulu)

```sh
go build -ldflags "-X main.isProdBuild=y"
```
