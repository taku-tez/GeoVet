# GeoVet 🌍

IP/Endpoint Geolocation CLI - ASM向け地理情報特定ツール

[![npm version](https://badge.fury.io/js/geovet.svg)](https://badge.fury.io/js/geovet)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🌐 IP/ドメインから地理情報を取得
- 🚀 ローカルDB（GeoLite2）で高速処理
- 🌍 ipinfo.io APIで最新データ取得
- 📊 バッチ処理・パイプ入力対応
- ⚡ 並列処理で大量IP高速処理
- 🔄 自動フォールバック（auto provider）
- ⚠️ **CDN検出** - CloudFront/Cloudflare/Akamai等を自動検出

## Installation

```bash
npm install -g geovet
```

## Quick Start

```bash
# IPアドレス
geovet lookup 8.8.8.8

# ドメイン
geovet lookup google.com

# 複数ターゲット
geovet lookup 8.8.8.8 1.1.1.1 cloudflare.com

# ファイルから
geovet lookup -f targets.txt

# パイプ
cat ips.txt | geovet lookup --stdin

# JSON出力
geovet lookup 8.8.8.8 --json
```

## Providers

### Local (GeoLite2) - デフォルト

高速・オフライン動作。要初回DBセットアップ。

```bash
# DBダウンロード（要MaxMindアカウント）
geovet db update --license-key YOUR_KEY

# または環境変数
export MAXMIND_LICENSE_KEY=YOUR_KEY
geovet db update

# 使用
geovet lookup 8.8.8.8 --provider local
```

MaxMindの無料アカウントは[こちら](https://www.maxmind.com/en/geolite2/signup)から。

### ipinfo.io

最新データ。無料50k/月。

```bash
geovet lookup 8.8.8.8 --provider ipinfo

# APIキーで制限緩和
export IPINFO_TOKEN=your_token
geovet lookup 8.8.8.8 --provider ipinfo
```

### Auto（フォールバック）

local → ipinfo の順に試行。

```bash
geovet lookup 8.8.8.8 --provider auto
```

## CLI Options

### lookup コマンド

```bash
geovet lookup [targets...] [options]
```

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `-p, --provider <type>` | プロバイダー: `local`, `ipinfo`, `auto` | `local` |
| `-f, --file <path>` | ターゲットをファイルから読み込み（1行1ターゲット） | - |
| `--stdin` | 標準入力からターゲットを読み込み | - |
| `-j, --json` | JSON形式で出力 | - |
| `--summary` | 国別分布などのサマリー統計を表示 | - |
| `-c, --concurrency <num>` | 並列処理数（1-100推奨） | 50 (local) / 10 (ipinfo) |
| `--progress` | 大量処理時にプログレスバー表示 | - |
| `-v, --verbose` | 詳細出力 | - |

### 使用例

```bash
# 基本
geovet lookup 8.8.8.8

# バッチ処理（ファイルから + 並列20）
geovet lookup -f targets.txt -c 20 --progress

# パイプ + サマリー
cat ips.txt | geovet lookup --stdin --summary

# CSVから抽出してスキャン
cat hosts.csv | tail -n +2 | cut -d',' -f1 | geovet lookup --stdin --progress -c 10

# JSON出力（jqで加工）
geovet lookup 8.8.8.8 1.1.1.1 --json | jq '.[] | select(.cdn.isCdn)'
```

## Output

### Table (default)

```
✓ 8.8.8.8
  Location: Mountain View, California, US
  Coordinates: 37.4056, -122.0775
  Timezone: America/Los_Angeles
  Network: AS15169 Google LLC
  Provider: local
```

### JSON

```bash
geovet lookup 8.8.8.8 --json
```

```json
{
  "input": "8.8.8.8",
  "ip": "8.8.8.8",
  "geo": {
    "ip": "8.8.8.8",
    "country": "United States",
    "countryCode": "US",
    "region": "California",
    "city": "Mountain View",
    "latitude": 37.4056,
    "longitude": -122.0775,
    "timezone": "America/Los_Angeles"
  },
  "network": {
    "asn": 15169,
    "org": "Google LLC"
  },
  "provider": "local"
}
```

## Database Management

```bash
# ステータス確認
geovet db status

# 更新
geovet db update --license-key YOUR_KEY
```

DBは `~/.geovet/` に保存されます。

## CDN Detection

GeoVetはCDN/クラウドプロバイダーを自動検出し、警告を表示します。

```
✓ example.com
  IP: 13.33.235.123
  Location: Helsinki, Uusimaa, FI
  Network: AS16509 Amazon.com, Inc.
  ⚠ CDN: Amazon CloudFront - Location is edge server, not origin
```

**検出対応プロバイダー:**
- Amazon CloudFront
- Cloudflare
- Akamai
- Fastly
- Azure CDN
- Google Cloud CDN
- その他多数

**注意:** CDN経由のサイトは、オリジンサーバーの場所ではなく、リクエスト元に近いエッジサーバーの場所が表示されます。

## Use Cases (ASM)

- 🌐 外部公開資産の地理分布可視化
- 🕵️ 想定外の国にあるエンドポイント検出（シャドウIT）
- 📋 データ主権/コンプライアンスチェック
- 🌍 CDNエッジロケーション確認

## Programmatic Usage

```typescript
import { lookup, lookupBatch } from 'geovet';

const result = await lookup('8.8.8.8', { provider: 'ipinfo' });
console.log(result.geo.country); // "United States"

const results = await lookupBatch(['8.8.8.8', 'google.com'], { provider: 'auto' });
```

## Part of xxVet Series

xxVet is a collection of 15 focused security CLI tools. See [full catalog](https://www.notion.so/xxVet-CLI-304b1e6bcbc2817abe62d4aecee9914a).

## License

MIT

---

This product includes GeoLite2 data created by MaxMind, available from [https://www.maxmind.com](https://www.maxmind.com).
