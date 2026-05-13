# shinran（歎異抄・教行信証 読解）

親鸞の『歎異抄』と『教行信証』関連テキストを、目次から読める静的サイトです。現代語訳はバッチ生成した成果物を同梱します。

リポジトリ: https://github.com/keijijin/shinran

## 開発

```bash
npm ci
npm run dev
```

## ビルド

```bash
npm run build
```

静的成果物は `out/` に出力されます（`output: "export"`）。

## コンテナ（OpenShift / Kubernetes）

`Dockerfile` は multi-stage で `npm run build` 後、`out/` を nginx（非特権・ポート **8080**）で配信します。

```bash
docker build -t shinran-web:local .
docker run --rm -p 8080:8080 shinran-web:local
```

OpenShift で **「Application is not available」** と出る場合は、多くは **Pod が Ready になっていない**か **Service のポートが 8080 と合っていない**ことが原因です。手順は [deploy/openshift/README.md](deploy/openshift/README.md) のトラブルシュートを参照してください。
