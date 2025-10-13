# ConvertaJá — Publicação Android (TWA)

Este guia resume os passos para criar o app Android via Trusted Web Activity (Bubblewrap) a partir do seu PWA hospedado em GitHub Pages.

Pré-requisitos
- Conta no Google Play Console (taxa paga) e Android Studio instalado
- Node.js LTS e Java 17+
- Domínio HTTPS servindo o PWA (ex.: https://ismaelly1984.github.io/ConvertaJa/)

1) Gerar chave de upload e pegar SHA-256
```
keytool -genkeypair -v -storetype JKS -keystore upload-keystore.jks -alias upload -keyalg RSA -keysize 2048 -validity 36500
keytool -list -v -keystore upload-keystore.jks -alias upload | grep SHA256 -A1
```

2) Publicar Digital Asset Links (obrigatório em TWA)
- Edite `docs/assetlinks.json.template` com seu `package_name` e o SHA-256
- Publique em `https://<seu-dominio>/.well-known/assetlinks.json`
- No GitHub Pages (user site): repositório `SEUUSUARIO/SEUUSUARIO.github.io` e arquivo `/.well-known/assetlinks.json`

3) Instalar Bubblewrap e iniciar projeto
```
npm i -g @bubblewrap/cli
bubblewrap init \
  --manifest=https://ismaelly1984.github.io/ConvertaJa/manifest.webmanifest \
  --host ismaelly1984.github.io \
  --startUrl /ConvertaJa/ \
  --packageId br.com.seu.pacote \
  --name "ConvertaJá"

bubblewrap updateConfig --signingKey ./upload-keystore.jks --password <senha> --alias upload
```

4) Gerar o bundle (.aab)
```
bubblewrap build --appVersionName 1.0.0 --appVersionCode 1 --bundle
# Saída: android/app/build/outputs/bundle/release/app-release.aab
```

5) Enviar ao Play Console
- Crie uma listagem: ícone 512x512, feature graphic 1024x500, screenshots
- Preencha “Segurança de dados” (sem retenção; exclusão automática em ~30 min)
- Anexe a URL da Política de Privacidade: `https://ismaelly1984.github.io/ConvertaJa/privacy.html`

Notas
- `frontend/public/manifest.webmanifest` já possui `start_url` e `scope` para `/ConvertaJa/`
- Backend deve permitir CORS para: `https://ismaelly1984.github.io`
- Se preferir não usar TWA, considere Capacitor (WebView) e gere o projeto nativo com os assets offline.

