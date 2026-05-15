// AIが毎日スコアリングする「監視対象の銘柄リスト」
// 日経225・東証プライムの代表的な銘柄を中心に、初心者にもなじみのある会社を入れている。
// ここに無い銘柄でも、ユーザーのウォッチリストにあれば自動で追加される。

export type UniverseEntry = {
  ticker: string;
  name: string;
  sector: string;
};

export const STOCK_UNIVERSE: UniverseEntry[] = [
  // 自動車
  { ticker: "7203.T", name: "トヨタ自動車", sector: "自動車" },
  { ticker: "7267.T", name: "ホンダ", sector: "自動車" },
  { ticker: "7201.T", name: "日産自動車", sector: "自動車" },
  { ticker: "7269.T", name: "スズキ", sector: "自動車" },

  // 電機・精密
  { ticker: "6758.T", name: "ソニーグループ", sector: "電機" },
  { ticker: "6752.T", name: "パナソニックHD", sector: "電機" },
  { ticker: "6501.T", name: "日立製作所", sector: "電機" },
  { ticker: "6594.T", name: "ニデック", sector: "電機" },
  { ticker: "6981.T", name: "村田製作所", sector: "電機" },
  { ticker: "7751.T", name: "キヤノン", sector: "精密" },
  { ticker: "7741.T", name: "HOYA", sector: "精密" },

  // 半導体・装置
  { ticker: "8035.T", name: "東京エレクトロン", sector: "半導体" },
  { ticker: "6920.T", name: "レーザーテック", sector: "半導体" },
  { ticker: "6857.T", name: "アドバンテスト", sector: "半導体" },
  { ticker: "6963.T", name: "ローム", sector: "半導体" },

  // 通信・IT
  { ticker: "9432.T", name: "NTT", sector: "通信" },
  { ticker: "9433.T", name: "KDDI", sector: "通信" },
  { ticker: "9434.T", name: "ソフトバンク", sector: "通信" },
  { ticker: "9984.T", name: "ソフトバンクグループ", sector: "情報通信" },
  { ticker: "4689.T", name: "LINEヤフー", sector: "情報通信" },
  { ticker: "4755.T", name: "楽天グループ", sector: "情報通信" },
  { ticker: "3659.T", name: "ネクソン", sector: "情報通信" },

  // 金融
  { ticker: "8306.T", name: "三菱UFJフィナンシャル", sector: "銀行" },
  { ticker: "8316.T", name: "三井住友フィナンシャル", sector: "銀行" },
  { ticker: "8411.T", name: "みずほフィナンシャル", sector: "銀行" },
  { ticker: "8591.T", name: "オリックス", sector: "金融" },
  { ticker: "8604.T", name: "野村ホールディングス", sector: "証券" },
  { ticker: "8766.T", name: "東京海上HD", sector: "保険" },

  // 商社
  { ticker: "8058.T", name: "三菱商事", sector: "商社" },
  { ticker: "8031.T", name: "三井物産", sector: "商社" },
  { ticker: "8001.T", name: "伊藤忠商事", sector: "商社" },
  { ticker: "8053.T", name: "住友商事", sector: "商社" },
  { ticker: "8002.T", name: "丸紅", sector: "商社" },

  // 小売・サービス
  { ticker: "9983.T", name: "ファーストリテイリング", sector: "小売" },
  { ticker: "3382.T", name: "セブン&アイ", sector: "小売" },
  { ticker: "8267.T", name: "イオン", sector: "小売" },
  { ticker: "3092.T", name: "ZOZO", sector: "小売" },
  { ticker: "9843.T", name: "ニトリHD", sector: "小売" },

  // 食品・飲料
  { ticker: "2914.T", name: "JT", sector: "食品" },
  { ticker: "2502.T", name: "アサヒグループ", sector: "食品" },
  { ticker: "2503.T", name: "キリンHD", sector: "食品" },
  { ticker: "2802.T", name: "味の素", sector: "食品" },

  // 医薬
  { ticker: "4502.T", name: "武田薬品工業", sector: "医薬品" },
  { ticker: "4519.T", name: "中外製薬", sector: "医薬品" },
  { ticker: "4568.T", name: "第一三共", sector: "医薬品" },
  { ticker: "4523.T", name: "エーザイ", sector: "医薬品" },

  // 化学・素材
  { ticker: "4063.T", name: "信越化学工業", sector: "化学" },
  { ticker: "4188.T", name: "三菱ケミカル", sector: "化学" },
  { ticker: "3407.T", name: "旭化成", sector: "化学" },
  { ticker: "4452.T", name: "花王", sector: "化学" },

  // 鉄鋼・機械
  { ticker: "5401.T", name: "日本製鉄", sector: "鉄鋼" },
  { ticker: "6301.T", name: "コマツ", sector: "機械" },
  { ticker: "6367.T", name: "ダイキン工業", sector: "機械" },
  { ticker: "7011.T", name: "三菱重工業", sector: "機械" },
  { ticker: "6098.T", name: "リクルートHD", sector: "サービス" },

  // 鉄道・運輸
  { ticker: "9020.T", name: "JR東日本", sector: "鉄道" },
  { ticker: "9022.T", name: "JR東海", sector: "鉄道" },
  { ticker: "9101.T", name: "日本郵船", sector: "海運" },

  // エネルギー
  { ticker: "5020.T", name: "ENEOS", sector: "石油" },
  { ticker: "1605.T", name: "INPEX", sector: "石油" },
  { ticker: "9501.T", name: "東京電力HD", sector: "電力" },

  // ゲーム・エンタメ
  { ticker: "7974.T", name: "任天堂", sector: "ゲーム" },
  { ticker: "9697.T", name: "カプコン", sector: "ゲーム" },
  { ticker: "7832.T", name: "バンダイナムコHD", sector: "ゲーム" },
];
