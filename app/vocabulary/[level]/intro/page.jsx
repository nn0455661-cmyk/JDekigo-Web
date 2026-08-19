"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Volume2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/useLanguage";
import { DEFAULT_LEVEL, normalizeLevel } from "@/constants/levels";

const HIRAGANA_ROWS = [
    ["a", "あ", "i", "い", "u", "う", "e", "え", "o", "お"],
    ["ka", "か", "ki", "き", "ku", "く", "ke", "け", "ko", "こ"],
    ["sa", "さ", "shi", "し", "su", "す", "se", "せ", "so", "そ"],
    ["ta", "た", "chi", "ち", "tsu", "つ", "te", "て", "to", "と"],
    ["na", "な", "ni", "に", "nu", "ぬ", "ne", "ね", "no", "の"],
    ["ha", "は", "hi", "ひ", "fu", "ふ", "he", "へ", "ho", "ほ"],
    ["ma", "ま", "mi", "み", "mu", "む", "me", "め", "mo", "も"],
    ["ya", "や", "-", "", "yu", "ゆ", "-", "", "yo", "よ"],
    ["ra", "ら", "ri", "り", "ru", "る", "re", "れ", "ro", "ろ"],
    ["wa", "わ", "-", "", "-", "", "-", "", "wo", "を"],
    ["n", "ん", "", "", "", "", "", "", "", ""],
];

const HIRAGANA_DAKUTEN = [
    ["ga", "が", "gi", "ぎ", "gu", "ぐ", "ge", "げ", "go", "ご"],
    ["za", "ざ", "ji", "じ", "zu", "ず", "ze", "ぜ", "zo", "ぞ"],
    ["da", "だ", "ji", "ぢ", "zu", "づ", "de", "で", "do", "ど"],
    ["ba", "ば", "bi", "び", "bu", "ぶ", "be", "べ", "bo", "ぼ"],
    ["pa", "ぱ", "pi", "ぴ", "pu", "ぷ", "pe", "ぺ", "po", "ぽ"],
];

const HIRAGANA_YOUON = [
    ["kya", "きゃ", "kyu", "きゅ", "kyo", "きょ"],
    ["sha", "しゃ", "shu", "しゅ", "sho", "しょ"],
    ["cha", "ちゃ", "chu", "ちゅ", "cho", "ちょ"],
    ["nya", "にゃ", "nyu", "にゅ", "nyo", "にょ"],
    ["hya", "ひゃ", "hyu", "ひゅ", "hyo", "ひょ"],
    ["mya", "みゃ", "myu", "みゅ", "myo", "みょ"],
    ["rya", "りゃ", "ryu", "りゅ", "ryo", "りょ"],
    ["gya", "ぎゃ", "gyu", "ぎゅ", "gyo", "ぎょ"],
    ["ja", "じゃ", "ju", "じゅ", "jo", "じょ"],
    ["bya", "びゃ", "byu", "びゅ", "byo", "びょ"],
    ["pya", "ぴゃ", "pyu", "ぴゅ", "pyo", "ぴょ"],
];

const KATAKANA_ROWS = [
    ["a", "ア", "i", "イ", "u", "ウ", "e", "エ", "o", "オ"],
    ["ka", "カ", "ki", "キ", "ku", "ク", "ke", "ケ", "ko", "コ"],
    ["sa", "サ", "shi", "シ", "su", "ス", "se", "セ", "so", "ソ"],
    ["ta", "タ", "chi", "チ", "tsu", "ツ", "te", "テ", "to", "ト"],
    ["na", "ナ", "ni", "ニ", "nu", "ヌ", "ne", "ネ", "no", "ノ"],
    ["ha", "ハ", "hi", "ヒ", "fu", "フ", "he", "ヘ", "ho", "ホ"],
    ["ma", "マ", "mi", "ミ", "mu", "ム", "me", "メ", "mo", "モ"],
    ["ya", "ヤ", "-", "", "yu", "ユ", "-", "", "yo", "ヨ"],
    ["ra", "ラ", "ri", "リ", "ru", "ル", "re", "レ", "ro", "ロ"],
    ["wa", "ワ", "-", "", "-", "", "-", "", "wo", "ヲ"],
    ["n", "ン", "", "", "", "", "", "", "", ""],
];

const KATAKANA_DAKUTEN = [
    ["ga", "ガ", "gi", "ギ", "gu", "グ", "ge", "ゲ", "go", "ゴ"],
    ["za", "ザ", "ji", "ジ", "zu", "ズ", "ze", "ゼ", "zo", "ゾ"],
    ["da", "ダ", "ji", "ヂ", "zu", "ヅ", "de", "デ", "do", "ド"],
    ["ba", "バ", "bi", "ビ", "bu", "ブ", "be", "ベ", "bo", "ボ"],
    ["pa", "パ", "pi", "ピ", "pu", "プ", "pe", "ペ", "po", "ポ"],
];

const KATAKANA_YOUON = [
    ["kya", "キャ", "kyu", "キュ", "kyo", "キョ"],
    ["sha", "シャ", "shu", "シュ", "sho", "ショ"],
    ["cha", "チャ", "chu", "チュ", "cho", "チョ"],
    ["nya", "ニャ", "nyu", "ニュ", "nyo", "ニョ"],
    ["hya", "ヒャ", "hyu", "ヒュ", "hyo", "ヒョ"],
    ["mya", "ミャ", "myu", "ミュ", "myo", "ミョ"],
    ["rya", "リャ", "ryu", "リュ", "ryo", "リョ"],
    ["gya", "ギャ", "gyu", "ギュ", "gyo", "ギョ"],
    ["ja", "ジャ", "ju", "ジュ", "jo", "ジョ"],
    ["bya", "ビャ", "byu", "ビュ", "byo", "ビョ"],
    ["pya", "ピャ", "pyu", "ピュ", "pyo", "ピョ"],
];

const WEEKDAY_ROWS = [
    ["月曜日", "げつようび", "getsuyoubi", "Thứ hai"],
    ["火曜日", "かようび", "kayoubi", "Thứ ba"],
    ["水曜日", "すいようび", "suiyoubi", "Thứ tư"],
    ["木曜日", "もくようび", "mokuyoubi", "Thứ năm"],
    ["金曜日", "きんようび", "kinyoubi", "Thứ sáu"],
    ["土曜日", "どようび", "doyoubi", "Thứ bảy"],
    ["日曜日", "にちようび", "nichiyoubi", "Chủ nhật"],
];

const MONTH_ROWS = [
    ["1月", "いちがつ", "ichigatsu", "Tháng 1"],
    ["2月", "にがつ", "nigatsu", "Tháng 2"],
    ["3月", "さんがつ", "sangatsu", "Tháng 3"],
    ["4月", "しがつ", "shigatsu", "Tháng 4"],
    ["5月", "ごがつ", "gogatsu", "Tháng 5"],
    ["6月", "ろくがつ", "rokugatsu", "Tháng 6"],
    ["7月", "しちがつ", "shichigatsu", "Tháng 7"],
    ["8月", "はちがつ", "hachigatsu", "Tháng 8"],
    ["9月", "くがつ", "kugatsu", "Tháng 9"],
    ["10月", "じゅうがつ", "juugatsu", "Tháng 10"],
    ["11月", "じゅういちがつ", "juuichigatsu", "Tháng 11"],
    ["12月", "じゅうにがつ", "juunigatsu", "Tháng 12"],
];

const DATE_ROWS = [
    ["1日", "ついたち", "tsuitachi", "Ngày 1"],
    ["2日", "ふつか", "futsuka", "Ngày 2"],
    ["3日", "みっか", "mikka", "Ngày 3"],
    ["4日", "よっか", "yokka", "Ngày 4"],
    ["5日", "いつか", "itsuka", "Ngày 5"],
    ["6日", "むいか", "muika", "Ngày 6"],
    ["7日", "なのか", "nanoka", "Ngày 7"],
    ["8日", "ようか", "youka", "Ngày 8"],
    ["9日", "ここのか", "kokonoka", "Ngày 9"],
    ["10日", "とおか", "tooka", "Ngày 10"],
    ["14日", "じゅうよっか", "juuyokka", "Ngày 14"],
    ["20日", "はつか", "hatsuka", "Ngày 20"],
    ["24日", "にじゅうよっか", "nijuuyokka", "Ngày 24"],
];

const AGE_ROWS = [
    ["1才", "いっさい", "issai", "1 tuổi"],
    ["8才", "はっさい", "hassai", "8 tuổi"],
    ["10才", "じゅっさい", "jussai", "10 tuổi"],
    ["20才", "はたち", "hatachi", "20 tuổi"],
    ["15才", "じゅうごさい", "juugosai", "15 tuổi"],
    ["27才", "にじゅうななさい", "nijuunanasai", "27 tuổi"],
];

const NUMBER_BASIC_ROWS = [
    ["1", "一", "いち", "ichi"],
    ["2", "二", "に", "ni"],
    ["3", "三", "さん", "san"],
    ["4", "四", "よん / し", "yon / shi"],
    ["5", "五", "ご", "go"],
    ["6", "六", "ろく", "roku"],
    ["7", "七", "なな / しち", "nana / shichi"],
    ["8", "八", "はち", "hachi"],
    ["9", "九", "きゅう / く", "kyuu / ku"],
    ["10", "十", "じゅう", "juu"],
];

const NUMBER_TENS_ROWS = [
    ["11", "十一", "じゅういち", "juuichi"],
    ["12", "十二", "じゅうに", "juuni"],
    ["13", "十三", "じゅうさん", "juusan"],
    ["14", "十四", "じゅうよん", "juuyon"],
    ["15", "十五", "じゅうご", "juugo"],
    ["20", "二十", "にじゅう", "nijuu"],
    ["21", "二十一", "にじゅういち", "nijuuichi"],
    ["30", "三十", "さんじゅう", "sanjuu"],
    ["40", "四十", "よんじゅう", "yonjuu"],
    ["50", "五十", "ごじゅう", "gojuu"],
    ["60", "六十", "ろくじゅう", "rokujuu"],
    ["70", "七十", "ななじゅう", "nanajuu"],
    ["80", "八十", "はちじゅう", "hachijuu"],
    ["90", "九十", "きゅうじゅう", "kyuujuu"],
    ["99", "九十九", "きゅうじゅうきゅう", "kyuujuukyuu"],
];

const NUMBER_HUNDREDS_ROWS = [
    ["100", "百", "ひゃく", "hyaku"],
    ["200", "二百", "にひゃく", "nihyaku"],
    ["300", "三百", "さんびゃく", "sanbyaku"],
    ["400", "四百", "よんひゃく", "yonhyaku"],
    ["500", "五百", "ごひゃく", "gohyaku"],
    ["600", "六百", "ろっぴゃく", "roppyaku"],
    ["700", "七百", "ななひゃく", "nanahyaku"],
    ["800", "八百", "はっぴゃく", "happyaku"],
    ["900", "九百", "きゅうひゃく", "kyuuhyaku"],
];

const NUMBER_THOUSANDS_ROWS = [
    ["1000", "千", "せん", "sen"],
    ["2000", "二千", "にせん", "nisen"],
    ["3000", "三千", "さんぜん", "sanzen"],
    ["4000", "四千", "よんせん", "yonsen"],
    ["5000", "五千", "ごせん", "gosen"],
    ["6000", "六千", "ろくせん", "rokusen"],
    ["7000", "七千", "ななせん", "nanasen"],
    ["8000", "八千", "はっせん", "hassen"],
    ["9000", "九千", "きゅうせん", "kyuusen"],
];

const NUMBER_LARGE_ROWS = [
    ["10,000", "一万", "いちまん", "ichiman"],
    ["20,000", "二万", "にまん", "niman"],
    ["50,000", "五万", "ごまん", "goman"],
    ["100,000", "十万", "じゅうまん", "juuman"],
    ["1,000,000", "百万", "ひゃくまん", "hyakuman"],
];

const COUNTER_TSU_ROWS = [
    ["1", "一つ", "ひとつ", "hitotsu"],
    ["2", "二つ", "ふたつ", "futatsu"],
    ["3", "三つ", "みっつ", "mittsu"],
    ["4", "四つ", "よっつ", "yottsu"],
    ["5", "五つ", "いつつ", "itsutsu"],
    ["6", "六つ", "むっつ", "muttsu"],
    ["7", "七つ", "ななつ", "nanatsu"],
    ["8", "八つ", "やっつ", "yattsu"],
    ["9", "九つ", "ここのつ", "kokonotsu"],
    ["10", "十", "とお", "too"],
];

const COUNTER_NIN_ROWS = [
    ["1", "一人", "ひとり", "hitori"],
    ["2", "二人", "ふたり", "futari"],
    ["3", "三人", "さんにん", "sannin"],
    ["4", "四人", "よにん", "yonin"],
    ["5", "五人", "ごにん", "gonin"],
    ["6", "六人", "ろくにん", "rokunin"],
    ["7", "七人", "ななにん", "nananin"],
    ["8", "八人", "はちにん", "hachinin"],
    ["9", "九人", "きゅうにん", "kyuunin"],
    ["10", "十人", "じゅうにん", "juunin"],
];

const COUNTER_HON_ROWS = [
    ["1", "一本", "いっぽん", "ippon"],
    ["2", "二本", "にほん", "nihon"],
    ["3", "三本", "さんぼん", "sanbon"],
    ["4", "四本", "よんほん", "yonhon"],
    ["5", "五本", "ごほん", "gohon"],
    ["6", "六本", "ろっぽん", "roppon"],
    ["7", "七本", "ななほん", "nanahon"],
    ["8", "八本", "はっぽん", "happon"],
    ["9", "九本", "きゅうほん", "kyuuhon"],
    ["10", "十本", "じゅっぽん", "juppon"],
];

const COUNTER_HIKI_ROWS = [
    ["1", "一匹", "いっぴき", "ippiki"],
    ["2", "二匹", "にひき", "nihiki"],
    ["3", "三匹", "さんびき", "sanbiki"],
    ["4", "四匹", "よんひき", "yonhiki"],
    ["5", "五匹", "ごひき", "gohiki"],
    ["6", "六匹", "ろっぴき", "roppiki"],
    ["7", "七匹", "ななひき", "nanahiki"],
    ["8", "八匹", "はっぴき", "happiki"],
    ["9", "九匹", "きゅうひき", "kyuuhiki"],
    ["10", "十匹", "じゅっぴき", "juppiki"],
];

const COUNTER_SATSU_ROWS = [
    ["1", "一冊", "いっさつ", "issatsu"],
    ["2", "二冊", "にさつ", "nisatsu"],
    ["3", "三冊", "さんさつ", "sansatsu"],
    ["4", "四冊", "よんさつ", "yonsatsu"],
    ["5", "五冊", "ごさつ", "gosatsu"],
    ["6", "六冊", "ろくさつ", "rokusatsu"],
    ["7", "七冊", "ななさつ", "nanasatsu"],
    ["8", "八冊", "はっさつ", "hassatsu"],
    ["9", "九冊", "きゅうさつ", "kyuusatsu"],
    ["10", "十冊", "じゅっさつ", "jussatsu"],
];

const COUNTER_KAI_ROWS = [
    ["1", "一階", "いっかい", "ikkai"],
    ["2", "二階", "にかい", "nikai"],
    ["3", "三階", "さんがい", "sangai"],
    ["4", "四階", "よんかい", "yonkai"],
    ["5", "五階", "ごかい", "gokai"],
    ["6", "六階", "ろっかい", "rokkai"],
    ["7", "七階", "ななかい", "nanakai"],
    ["8", "八階", "はっかい", "hakkai"],
    ["9", "九階", "きゅうかい", "kyuukai"],
    ["10", "十階", "じゅっかい", "jukkai"],
];

const GREETING_ROWS = [
    ["おはようございます", "Ohayou gozaimasu", "Chào buổi sáng"],
    ["こんにちは", "Konnichiwa", "Chào buổi trưa"],
    ["こんばんは", "Konbanwa", "Chào buổi tối"],
    ["おやすみなさい", "Oyasumi nasai", "Chúc ngủ ngon"],
    ["どうもありがとうございます", "(Doumo) arigatou gozaimasu", "Xin cảm ơn nhiều"],
    ["どいたしまして", "Douitashimashite", "Không có chi"],
    ["すみません", "Sumimasen", "Xin lỗi / Excuse me."],
    ["ごめんなさい", "Gomen nasai", "Xin lỗi / Sorry."],
    ["お先(さき)に失礼(しつれい)します。", "Osakini shitsureishimasu", "Tôi xin phép thất lễ về trước ạ"],
    ["おつかれさま(でした)", "Otsukare sama (deshita)", "Anh/Chị/Ngài đã vất vả rồi"],
    ["久(ひさ)しぶりです (ね)", "(O) Hisashiburi desu (ne)", "Lâu quá không gặp"],
    ["お元気(げんき)ですか？", "(O) genki desu ka?", "Bạn/ông/bà khỏe không?"],
    ["いただきます", "Itadakimasu", "Bắt đầu ăn thôi / Xin cảm ơn vì bữa ăn này (nói trước khi ăn)"],
    ["ごちそうさま(でした)", "Gochisousama (deshita)", "Xin cảm ơn vì bữa ăn (nói sau khi ăn)"],
    ["いってきます", "Ittekimasu", "Tôi/Anh... đi đây (và sẽ trở về sớm). I’m leaving and I will come back soon!"],
    ["いってらっしゃい", "Itterasshai", "Con/Anh... đi cẩn thận nhé! Have a safe trip / Take care"],
    ["ただいま", "Tadaima", "Con/Tôi... đã về rồi. I’m home now"],
    ["おかえりなさい", "Okaeri nasai", "Chào mừng con/anh... trở về. Welcome home!"],
];

const EXAMPLE_ROWS = [
    ["アメリカ", "amerika", "Mỹ"],
    ["イタリア", "itaria", "Ý"],
    ["オーストラリア", "oosutoraria", "Úc"],
    ["タイ", "tai", "Thái Lan"],
    ["ロシア", "roshia", "Nga"],
    ["ブラジル", "burajiru", "Brazil"],
    ["スポーツ", "supootsu", "thể thao"],
    ["サッカー", "sakkaa", "bóng đá"],
    ["テニス", "tenisu", "quần vợt"],
    ["インフォメーション", "infomeeshon", "thông tin"],
    ["エスカレーター", "esukareetaa", "cầu thang cuốn"],
    ["エレベーター", "erebeetaa", "thang máy"],
    ["トイレ", "toire", "toa-lét"],
    ["レジ", "reji", "chỗ tính tiền"],
    ["スーパー", "suupaa", "siêu thị"],
    ["100円ショップ", "hyakuen shoppu", "cửa hàng 100 yên"],
    ["レストラン", "resutoran", "nhà hàng"],
    ["カメラ", "kamera", "máy ảnh"],
    ["パソコン", "pasokon", "máy vi tính"],
    ["ペン", "pen", "bút"],
    ["トイレットペーパー", "toiretto peepaa", "giấy toa-lét"],
    ["ケーキ", "keeki", "bánh ngọt"],
    ["パン", "pan", "bánh mì"],
    ["ズボン", "zubon", "quần"],
    ["Tシャツ", "tii shatsu", "áo phông"],
    ["イチゴ", "ichigo", "dâu tây"],
    ["リンゴ", "ringo", "táo"],
    ["カレー", "karee", "món cơ-ri"],
    ["スープ", "suupu", "món súp"],
    ["ハンバーグ", "hanbaagu", "món thịt băm rán"],
    ["ライス", "raisu", "gạo, cơm"],
    ["ジュース", "juusu", "nước hoa quả"],
    ["コーヒー", "koohii", "cà-phê"],
    ["ビール", "biiru", "bia"],
    ["ワイン", "wain", "rượu vang"],
    ["インド", "indo", "Ấn Độ"],
    ["ドイツ", "doitsu", "Đức"],
    ["フランス", "furansu", "Pháp"],
    ["メニュー", "menyuu", "thực đơn"],
    ["スケジュール", "sukejuuru", "lịch làm việc"],
    ["アルバイト", "arubaito", "việc làm thêm"],
    ["スキー", "sukii", "trượt tuyết"],
    ["パーティー", "paatii", "bữa tiệc"],
    ["バーベキュー", "baabekyuu", "bữa tiệc thịt nướng"],
    ["ホームステイ", "hoomusutei", "trọ nhà người bản xứ"],
    ["バス", "basu", "xe buýt"],
    ["ゴールデンウィーク", "gooruden wiiku", "Tuần lễ vàng"],
    ["コンビニ", "konbini", "cửa hàng tiện lợi"],
    ["サラダ", "sarada", "món sa-lát"],
    ["チーズ", "chiizu", "pho-mát"],
    ["インターネット", "intaanetto", "Internet"],
    ["テレビ", "terebi", "ti-vi"],
];

function toKanaRowPairs(rows) {
    return rows.map((row) => {
        const pairs = [];
        for (let i = 0; i < row.length; i += 2) {
            const romaji = row[i];
            const kana = row[i + 1];

            if (!romaji || !kana || romaji === "-" || kana === "-") {
                continue;
            }

            pairs.push({ romaji, kana });
        }
        return pairs;
    });
}

function speakJapaneseText(text) {
    if (typeof window === "undefined" || !window.speechSynthesis) {
        return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.85;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
}

function KanaCardGrid({ title, rows, action }) {
    const pairRows = toKanaRowPairs(rows);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-soft)]">{title}</h3>
                {action}
            </div>
            <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5">
                {pairRows.map((row, rowIndex) => (
                    <div
                        key={`${title}-${rowIndex}`}
                        className="grid gap-1.5"
                        style={{ gridTemplateColumns: `repeat(${Math.max(row.length, 1)}, minmax(0, 1fr))` }}
                    >
                        {row.map((item, cellIndex) => (
                            <button
                                key={`${title}-${rowIndex}-${cellIndex}`}
                                type="button"
                                onClick={() => speakJapaneseText(item.kana)}
                                aria-label={`Phát âm ${item.kana}`}
                                className="group relative rounded-md border border-[#67cfab] bg-white px-1.5 py-1.5 text-center transition hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1"
                            >
                                <span className="absolute right-1.5 top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-[var(--color-bg-soft)] text-[var(--color-primary)] opacity-90 transition group-hover:scale-105 group-hover:opacity-100 sm:inline-flex" aria-hidden="true">
                                    <Volume2 className="h-3.5 w-3.5" />
                                </span>
                                <p className="whitespace-nowrap text-[1.4rem] font-semibold leading-none text-[#111827] sm:text-[2rem]">{item.kana}</p>
                                <p className="mt-0.5 text-xs font-semibold lowercase text-[#2f7f65] sm:text-sm">{item.romaji}</p>
                            </button>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

function InfoTable({ title, headers, rows, action }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-soft)]">{title}</h3>
                {action}
            </div>
            <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                <table className="min-w-[680px] table-fixed text-sm sm:w-full">
                    <thead className="bg-[var(--color-bg-soft)]">
                        <tr>
                            {headers.map((header) => (
                                <th key={header} className="px-3 py-2 text-left font-semibold text-[var(--color-text)]">
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, rowIndex) => (
                            <tr key={`${title}-${rowIndex}`} className="border-t border-[var(--color-border)]">
                                {row.map((cell, cellIndex) => (
                                    <td key={`${title}-${rowIndex}-${cellIndex}`} className="px-3 py-2 text-[var(--color-text)]">
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function VocabularyIntroPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const params = useParams();

    const rawLevel = String(params?.level || DEFAULT_LEVEL).toUpperCase();
    const level = normalizeLevel(rawLevel);

    const tabs = useMemo(
        () => [
            { id: "hiragana", label: "Hiragana" },
            { id: "katakana", label: "Katakana" },
            { id: "calendar", label: "Ngày - Thứ - Tháng - Năm" },
            { id: "age", label: "Đếm tuổi" },
            { id: "numbers", label: "Số đếm" },
            { id: "counters", label: "Lượng từ" },
            { id: "greetings", label: "Câu chào hỏi" },
        ],
        []
    );

    const [activeTab, setActiveTab] = useState("hiragana");
    const [showKatakanaExamples, setShowKatakanaExamples] = useState(false);

    useEffect(() => {
        if (rawLevel !== level) {
            router.replace(`/vocabulary/${level}/intro`);
        }
    }, [rawLevel, level, router]);

    return (
        <section className="dashboard-shell space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--icon-vocabulary-bg)] text-[var(--icon-vocabulary)]">
                        <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="section-title">Bài Nhập môn</h1>
                        <p className="text-sm text-[var(--color-text-soft)]">Nền tảng bảng chữ cái và cách đếm cơ bản</p>
                    </div>
                </div>

                <Link
                    href={`/vocabulary/${level}`}
                    className="back-action inline-flex items-center gap-2 rounded-xl border border-transparent bg-[var(--icon-vocabulary-bg)] px-3 py-2 text-sm font-semibold text-[var(--icon-vocabulary)] transition hover:opacity-90"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="back-label">Quay lại</span>
                </Link>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
                <div className="flex flex-wrap gap-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${activeTab === tab.id
                                    ? "border-[var(--color-primary)] bg-[var(--color-bg-soft)] text-[var(--color-primary)]"
                                    : "border-[var(--color-border)] text-[var(--color-text-soft)] hover:bg-[var(--color-bg-soft)]"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
                    {activeTab === "hiragana" && (
                        <div className="space-y-4">
                            <KanaCardGrid title="Bảng cơ bản" rows={HIRAGANA_ROWS} />
                            <KanaCardGrid title="Dakuten / Handakuten" rows={HIRAGANA_DAKUTEN} />
                            <KanaCardGrid title="Bảng ghép âm (Youon)" rows={HIRAGANA_YOUON} />
                        </div>
                    )}

                    {activeTab === "katakana" && (
                        <div className="space-y-4">
                            {showKatakanaExamples ? (
                                <InfoTable
                                    title="Ví dụ từ vựng"
                                    action={
                                        <button
                                            type="button"
                                            onClick={() => setShowKatakanaExamples(false)}
                                            className="rounded-full border border-[var(--color-primary)] bg-[var(--color-bg-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)] transition hover:opacity-85"
                                        >
                                            Bảng chữ cái
                                        </button>
                                    }
                                    headers={["Tiếng Nhật", "Romaji", "Tiếng Việt"]}
                                    rows={EXAMPLE_ROWS}
                                />
                            ) : (
                                <>
                                    <KanaCardGrid
                                        title="Bảng cơ bản"
                                        rows={KATAKANA_ROWS}
                                        action={
                                            <button
                                                type="button"
                                                onClick={() => setShowKatakanaExamples(true)}
                                                className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--color-text-soft)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                                            >
                                                Ví dụ
                                            </button>
                                        }
                                    />
                                    <KanaCardGrid title="Dakuten / Handakuten" rows={KATAKANA_DAKUTEN} />
                                    <KanaCardGrid title="Bảng ghép âm (Youon)" rows={KATAKANA_YOUON} />
                                </>
                            )}
                        </div>
                    )}


                    {activeTab === "calendar" && (
                        <div className="space-y-4">
                            <InfoTable title="Thứ trong tuần" headers={["Kanji", "Hiragana", "Romaji", "Tiếng Việt"]} rows={WEEKDAY_ROWS} />
                            <InfoTable title="Tháng" headers={["Kanji", "Hiragana", "Romaji", "Tiếng Việt"]} rows={MONTH_ROWS} />
                            <InfoTable
                                title="Công thức đếm ngày"
                                headers={["Quy tắc", "Mẫu", "Hiragana"]}
                                rows={[["Ngày trong tháng", "số + 日", "すうじ + にち"]]}
                            />
                            <InfoTable title="Trường hợp đặc biệt" headers={["Kanji", "Hiragana", "Romaji"]} rows={DATE_ROWS.map((row) => row.slice(0, 3))} />
                            <InfoTable
                                title="Năm"
                                headers={["Mẫu", "Hiragana", "Romaji", "Ví dụ"]}
                                rows={[["...年", "...ねん", "...nen", "2026年 = にせんにじゅうろくねん"]]}
                            />
                        </div>
                    )}

                    {activeTab === "age" && (
                        <div className="space-y-4">
                            <InfoTable
                                title="Công thức"
                                headers={["Quy tắc", "Mẫu", "Hiragana"]}
                                rows={[["Đếm tuổi", "số + 才", "すうじ + さい"]]}
                            />
                            <InfoTable title="Trường hợp đặc biệt" headers={["Kanji", "Hiragana", "Romaji", "Nghĩa"]} rows={AGE_ROWS} />
                        </div>
                    )}

                    {activeTab === "numbers" && (
                        <div className="space-y-4">
                            <InfoTable title="Số cơ bản 1-10" headers={["Số", "Kanji", "Hiragana", "Romaji"]} rows={NUMBER_BASIC_ROWS} />
                            <InfoTable title="11-99 (mẫu thường dùng)" headers={["Số", "Kanji", "Hiragana", "Romaji"]} rows={NUMBER_TENS_ROWS} />
                            <InfoTable title="Hàng trăm" headers={["Số", "Kanji", "Hiragana", "Romaji"]} rows={NUMBER_HUNDREDS_ROWS} />
                            <InfoTable title="Hàng nghìn" headers={["Số", "Kanji", "Hiragana", "Romaji"]} rows={NUMBER_THOUSANDS_ROWS} />
                            <InfoTable title="10,000 trở lên" headers={["Số", "Kanji", "Hiragana", "Romaji"]} rows={NUMBER_LARGE_ROWS} />
                        </div>
                    )}

                    {activeTab === "counters" && (
                        <div className="space-y-4">
                            <InfoTable title="Đồ vật chung (つ)" headers={["Số", "Kanji", "Hiragana", "Romaji"]} rows={COUNTER_TSU_ROWS} />
                            <InfoTable title="Đếm người (人)" headers={["Số", "Kanji", "Hiragana", "Romaji"]} rows={COUNTER_NIN_ROWS} />
                            <InfoTable title="Sách, vở (冊)" headers={["Số", "Kanji", "Hiragana", "Romaji"]} rows={COUNTER_SATSU_ROWS} />
                            <InfoTable title="Tầng lầu (階)" headers={["Số", "Kanji", "Hiragana", "Romaji"]} rows={COUNTER_KAI_ROWS} />
                        </div>
                    )}

                    {activeTab === "greetings" && (
                        <div className="space-y-4">
                            <InfoTable
                                title="Câu chào hỏi"
                                headers={["Tiếng Nhật", "Romaji", "Nghĩa"]}
                                rows={GREETING_ROWS}
                            />
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
