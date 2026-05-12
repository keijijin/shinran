# OpenShift へのデプロイ

このリポジトリのルートにある `Dockerfile` で、Next.js の静的エクスポート（`out/`）を **nginx（非特権）** が **8080** で配信します。OpenShift の非 root 制約に合わせています。

## 前提

- `oc` CLI がログイン済みであること
- GitHub 上に本リポジトリが公開されていること（URL は以下の `GITHUB_REPO_URL` に置き換え）

## 方法 A: Git ソースから `new-app`（簡単）

プロジェクトを作成（または選択）したうえで:

```bash
export GITHUB_REPO_URL="https://github.com/YOUR_ORG/shinran.git"

oc new-project shinran-web --display-name="Shinran reader" || oc project shinran-web

oc new-app "$GITHUB_REPO_URL" \
  --name=shinran-web \
  --strategy=docker

oc expose svc/shinran-web
oc get route shinran-web -o jsonpath='{.spec.host}{"\n"}'
```

生成された Route の URL でサイトにアクセスできます。ビルドログは `oc logs -f bc/shinran-web` で確認してください。

## 方法 B: ローカルからバイナリビルド

リポジトリのルートで:

```bash
oc new-project shinran-web --display-name="Shinran reader" || oc project shinran-web

oc new-build --name=shinran-web --strategy=docker --binary

oc start-build shinran-web --from-dir=. --follow

oc new-app image-registry.openshift-image-registry.svc:5000/shinran-web/shinran-web:latest \
  --name=shinran-web

oc expose svc/shinran-web
```

（イメージ名はクラスタの ImageStream 名に合わせて調整してください。`oc get is` で確認できます。）

## トラブルシュート

- **ビルド失敗**: `doc/` と `content/translations.json` がリポジトリに含まれているか確認してください（`prebuild` で ingest が走ります）。
- **Route はあるが真っ白**: ブラウザの開発者ツールで 404 を確認し、`trailingSlash` 付き URL（例: `/about/`）で開いてみてください。
