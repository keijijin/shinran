# OpenShift へのデプロイ

このリポジトリのルートにある `Dockerfile` で、Next.js の静的エクスポート（`out/`）を **nginx（非特権）** が **8080** で配信します。OpenShift の非 root 制約に合わせています。

## 前提

- `oc` CLI がログイン済みであること
- GitHub 上に本リポジトリが公開されていること（本家の例: `https://github.com/keijijin/shinran.git`）

## 方法 A: Git ソースから `new-app`（簡単）

プロジェクトを作成（または選択）したうえで:

```bash
export GITHUB_REPO_URL="https://github.com/keijijin/shinran.git"

oc new-project shinran-web --display-name="Shinran reader" || oc project shinran-web

oc new-app "$GITHUB_REPO_URL" \
  --name=shinran-web \
  --strategy=docker

oc expose svc/shinran-web
oc get route shinran-web -o jsonpath='http://{.spec.host}/{"\n"}'
```

ブラウザで **`https://`** だけ開けて **`http://`** が開けない環境では、下記「まだブラウザにページが出ないとき」の **edge TLS** を付けてから `https://...` で試してください。

上の `jsonpath` が出す **http://…/** をブラウザで開いてください。ビルドログは `oc logs -f bc/shinran-web` で確認できます。

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

## 「Application is not available」が出るとき

OpenShift のルーターは、**Route の先に Ready な Pod が 1 つも無い**ときにこのページを返します。次の順で確認してください。

### 1. Pod の状態

`oc new-app` やテンプレートによっては、Pod に **`app=shinran-web` が付かない**ことがあります。その場合、`oc get pods -l app=shinran-web` は空でも、Service の背後には Pod がいることがあります（`oc get endpoints` に IP が出る状態）。

まず **ラベルなし**で一覧し、**Deployment 名**でログを取るのが確実です。

```bash
oc project shinran-web
oc get pods
oc get pods --show-labels
oc describe svc shinran-web | grep -A5 '^Selector'
```

ログ・イベントは次でも取得できます（Deployment 名は `oc get deploy` で確認）。

```bash
oc logs deployment/shinran-web --tail=80
oc describe deployment shinran-web | tail -30
```

ラベルで絞りたい場合の例（環境に合わせて調整）:

```bash
oc get pods -l app=shinran-web
oc get pods -l deployment=shinran-web
oc get pods -l deploymentconfig=shinran-web
```

`CrashLoopBackOff` / `ImagePullBackOff` / `ErrImagePull` / `CreateContainerConfigError` なら、まだ HTTP まで届いていません。

```bash
POD=$(oc get pods -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
[ -n "$POD" ] && oc logs "$POD" --tail=80
[ -n "$POD" ] && oc describe pod "$POD" | tail -40
```

### 2. エンドポイント（Service の裏に Pod が載っているか）

```bash
oc get endpoints shinran-web -o wide
```

`ENDPOINTS` が **空**のままなら、Route は繋がりません。原因は多くの場合 **readiness 失敗** か **ラベル不一致** です。

```bash
oc get svc shinran-web -o yaml | grep -E 'selector|targetPort|port:'
oc get pods --show-labels | grep shinran
```

`targetPort` が **8080**（コンテナが待ち受けているポート）になっているか確認してください。`8080-tcp` などの名前でも、実体が **8080** なら問題ありません。

### 3. Route が指している Service / ポート

```bash
oc describe route shinran-web
```

`TargetPort` が Service のポート名または番号と一致しているか確認します。

### 4. ビルドがメモリ不足で落ちていないか

`npm ci` / `next build` はメモリを使います。クラスタのデフォルトだと **OOMKilled** になりがちです。

```bash
oc get build -l app=shinran-web
oc logs bc/shinran-web --tail=100
```

ビルドが落ちる場合は、BuildConfig にリソース上限を足します（値は環境に合わせて調整）。

```bash
oc patch bc/shinran-web --type=json -p='[
  {"op":"add","path":"/spec/resources","value":{
    "limits":{"memory":"4Gi","cpu":"2"},
    "requests":{"memory":"1Gi","cpu":"500m"}
  }}
]'
```

その後、再ビルドします。

```bash
oc start-build shinran-web --follow
```

### 5. Readiness / Liveness が誤ったポートを見ていないか

`new-app` が生成した Deployment で、Probe が **80** など別ポートになっていると、**Ready 0** のままになります。次のように **8080** とパス **`/healthz`**（リポジトリの `public/healthz` が静的出力に含まれます）へ直してください。

```bash
oc set probe deployment/shinran-web --readiness --get-url=http://:8080/healthz --initial-delay-seconds=5 --timeout-seconds=3 --period-seconds=10
oc set probe deployment/shinran-web --liveness --get-url=http://:8080/healthz --initial-delay-seconds=20 --timeout-seconds=3 --period-seconds=20
```

（リソース名が `deployment.apps/shinran-web` のみの場合は `deployment/shinran-web` で問題ありません。）

### 6. Service の targetPort を明示的に 8080 に合わせる

```bash
oc patch svc shinran-web --type=json -p='[
  {"op":"replace","path":"/spec/ports/0/port","value":8080},
  {"op":"replace","path":"/spec/ports/0/targetPort","value":8080},
  {"op":"replace","path":"/spec/ports/0/name","value":"http"}
]'
```

Route の `targetPort` を **`http`**（上で付けた名前）に合わせる場合:

```bash
oc patch route shinran-web --type=json -p='[
  {"op":"replace","path":"/spec/port/targetPort","value":"http"}
]'
```

---

## nginx の起動ログについて

次のような **1 行**が出ることがあります。

```text
10-listen-on-ipv6-by-default.sh: info: can not modify /etc/nginx/conf.d/default.conf (read-only file system?)
```

これは `nginxinc/nginx-unprivileged` のエントリポイントが、**IPv6 用の listen 行を自動で書き換えようとして失敗した**ときの **info** です（プロジェクトで **readOnlyRootFilesystem** などが有効だと起きやすい）。その直後に **`Configuration complete; ready for start up`** と **`start worker processes`** が続き、`oc get pods` が **`1/1 Running`** なら、**nginx は正常に動いています**。対処は必須ではありません。

---

## まだブラウザにページが出ないとき（Pod は Running）

`oc get pods` が **`1/1 Running`** で、`oc describe route` に **Endpoints** が付いているのに、ブラウザだけ何も出ない／接続できない場合の切り分けです。

### 1. まず **http://** の URL をそのまま使う

`TLS Termination: <none>` の Route は、インターネット→ルーター区間が **平文 HTTP** です。アドレスバーに **`https://`** と打つと、環境によっては **接続エラー**や **別ホストの証明書**になります。次の 1 行をコピーして **http** のまま開いてください。

```bash
oc get route shinran-web -o jsonpath='http://{.spec.host}/{"\n"}'
```

### 2. **`https://` で開きたい**場合：edge TLS を付ける（よく効く）

ルーターで TLS を終端し、Pod へのバックエンドはこれまで通り HTTP です。

```bash
oc patch route shinran-web -p '{"spec":{"tls":{"termination":"edge","insecureEdgeTerminationPolicy":"Redirect"}}}'
```

```bash
oc get route shinran-web -o jsonpath='https://{.spec.host}/{"\n"}'
```

### 3. 手元の PC から届いているか `curl` で確認

```bash
HOST=$(oc get route shinran-web -o jsonpath='{.spec.host}')
curl -vI "http://${HOST}/"
curl -vI "http://${HOST}/healthz"
```

**`HTTP/1.1 200`** が返れば、Route の先までは届いています。**Could not resolve host** やタイムアウトなら、**DNS**（Red Hat のサンドボックス `*.opentlc.com` は **Lab VPN や指定 DNS** が必要なことが多い）を確認してください。

### 4. Route を挟まず Service だけ確認（ローカル PC）

```bash
oc port-forward svc/shinran-web 18080:8080
```

別ターミナルで:

```bash
curl -sI http://127.0.0.1:18080/
```

ここが **200** なら nginx と静的ファイルは問題なく、残りは **Route・DNS・ブラウザの URL（http/https）** のどれかです。

---

## その他のトラブルシュート

- **ビルド失敗**: `doc/` と `content/translations.json` がリポジトリに含まれているか確認してください（`prebuild` で ingest が走ります）。
- **Route はあるが真っ白**: ブラウザの開発者ツールで 404 を確認し、`trailingSlash` 付き URL（例: `/about/`）で開いてみてください。
