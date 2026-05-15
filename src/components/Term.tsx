"use client";

import { useState, useRef, useEffect } from "react";
import { HelpCircle } from "lucide-react";

// 専門用語に小さな「？」マークを添え、タップ／ホバーで日本語の補足説明を出す。
// 初心者向け UI のキモ。

const GLOSSARY: Record<string, string> = {
  自信度: "AIがその予想にどれくらい自信を持っているかの目安。0〜100で、高いほど複数の指標が同じ方向を向いている。あくまで参考値で、当たることを保証するものではない。",
  リスク度: "値動きの荒さの目安。「高い」ほど短期間で大きく上下する。少額から試すのが無難。",
  短期: "数日〜数週間で値動きが出やすい予想。素早く判断したい時向け。",
  中長期: "1か月〜数か月の流れを見る予想。じっくり待ちたい時向け。",
  PER: "株価が割高か割安かを見る目安（株価収益率）。同じ業種内で比べると分かりやすい。",
  PBR: "1株あたりの会社の資産に対して株価が何倍かを見る目安。1倍を下回ると「資産割れ」と言われる。",
  RSI: "買われすぎ／売られすぎを示す指標。30以下で売られすぎ、70以上で買われすぎとされる。",
  出来高: "その日にどれくらい売買されたかの量。多いほど注目が集まっている。",
  移動平均線: "過去数日の終値の平均をつないだ線。トレンドの方向を見るのに使う。",
  ボラティリティ: "値動きの大きさ。数字が大きいほど荒い動きをする。",
  決算: "会社の業績発表。3か月ごとに行われる。",
  配当利回り: "株を持っていた時にもらえる配当の、株価に対する割合。",
  日経平均: "日本の代表的な225社の平均的な動きを示す指標。",
  TOPIX: "東証プライム全体の動きを示す指標。日経平均より幅広い。",
  押し目: "上昇トレンドの途中で一時的に下がること。買い時として注目されることがある。",
  ゴールデンクロス: "短い移動平均線が長い移動平均線を下から上に抜けること。買いシグナルとされる。",
  デッドクロス: "短い移動平均線が長い移動平均線を上から下に抜けること。売りシグナルとされる。",
  含み益: "持っている株が買った時より値上がりしているが、まだ売っていない利益。",
  含み損: "持っている株が買った時より値下がりしているが、まだ売っていない損。",
  確定損益: "実際に売却して確定した利益または損。",
  勝率: "売却した取引のうち、利益が出た割合。",
  累計成績: "これまでのすべての売却取引を合計した損益。",
  エア取引: "実際のお金は使わず、買った／売ったつもりで記録して練習する仕組み。",
};

export function Term({ children }: { children: string }) {
  const text = children;
  const description = GLOSSARY[text];
  return <Tooltip text={text} description={description ?? ""} />;
}

export function Tooltip({
  text,
  description,
}: {
  text: string;
  description: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onAway(e: Event) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onAway);
    document.addEventListener("touchstart", onAway);
    return () => {
      document.removeEventListener("mousedown", onAway);
      document.removeEventListener("touchstart", onAway);
    };
  }, [open]);

  if (!description) {
    return <span>{text}</span>;
  }

  return (
    <span className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex items-center gap-0.5 underline decoration-dotted decoration-1 underline-offset-2 hover:text-emerald-700 active:text-emerald-800"
      >
        <span>{text}</span>
        <HelpCircle className="w-3 h-3 opacity-60" aria-hidden />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-1.5 w-64 max-w-[80vw] rounded-xl bg-slate-900 text-white text-xs leading-relaxed px-3 py-2 shadow-xl"
        >
          <span className="block font-semibold mb-0.5">{text}</span>
          <span className="block opacity-90 whitespace-normal">{description}</span>
        </span>
      )}
    </span>
  );
}
