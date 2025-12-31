import json
from pathlib import Path

BASE_LANG = "en"
I18N_DIR = Path(__file__).resolve().parent.parent / "i18n"

TRANSLATIONS = {
    "fr": {
        "metadata": "métadonnées",
        "creditLine": "ligne de crédit",
        "source": "source",
        "copyrightNotice": "mention de copyright",
        "copyrightStatus": "statut du droit d'auteur",
        "rightsUsageTerms": "conditions d'utilisation des droits",
        "altText": "texte alternatif",
        "alt": "alt",
        "extendedAlt": "texte alternatif étendu",
        "caption": "légende",
        "headline": "titre",
        "extendedDescription": "description étendue",
        "description": "description",
    },
    "hi": {
        "metadata": "मेटाडेटा",
        "creditLine": "साभार पंक्ति",
        "source": "स्रोत",
        "copyrightNotice": "कॉपीराइट नोटिस",
        "copyrightStatus": "कॉपीराइट स्थिति",
        "rightsUsageTerms": "अधिकार और उपयोग की शर्तें",
        "altText": "Alt टेक्स्ट",
        "alt": "Alt",
        "extendedAlt": "विस्तारित Alt टेक्स्ट",
        "caption": "कैप्शन",
        "headline": "हेडलाइन",
        "extendedDescription": "विस्तारित विवरण",
        "description": "विवरण",
    },
    "id": {
        "metadata": "metadata",
        "creditLine": "baris kredit",
        "source": "sumber",
        "copyrightNotice": "pemberitahuan hak cipta",
        "copyrightStatus": "status hak cipta",
        "rightsUsageTerms": "syarat penggunaan hak",
        "altText": "teks alt",
        "alt": "alt",
        "extendedAlt": "teks alt diperluas",
        "caption": "keterangan",
        "headline": "tajuk",
        "extendedDescription": "deskripsi diperluas",
        "description": "deskripsi",
    },
    "it": {
        "metadata": "metadati",
        "creditLine": "riga di credito",
        "source": "fonte",
        "copyrightNotice": "avviso sul copyright",
        "copyrightStatus": "stato del copyright",
        "rightsUsageTerms": "termini di utilizzo dei diritti",
        "altText": "testo alternativo",
        "alt": "alt",
        "extendedAlt": "testo alternativo esteso",
        "caption": "didascalia",
        "headline": "titolo",
        "extendedDescription": "descrizione estesa",
        "description": "descrizione",
    },
    "ja": {
        "metadata": "メタデータ",
        "creditLine": "クレジットライン",
        "source": "ソース",
        "copyrightNotice": "著作権表示",
        "copyrightStatus": "著作権の状態",
        "rightsUsageTerms": "権利と使用条件",
        "altText": "代替テキスト",
        "alt": "Alt",
        "extendedAlt": "拡張代替テキスト",
        "caption": "キャプション",
        "headline": "見出し",
        "extendedDescription": "拡張説明",
        "description": "説明",
    },
    "ko": {
        "metadata": "메타데이터",
        "creditLine": "크레딧 라인",
        "source": "출처",
        "copyrightNotice": "저작권 공지",
        "copyrightStatus": "저작권 상태",
        "rightsUsageTerms": "권리 및 사용 조건",
        "altText": "대체 텍스트",
        "alt": "Alt",
        "extendedAlt": "확장된 대체 텍스트",
        "caption": "캡션",
        "headline": "헤드라인",
        "extendedDescription": "확장 설명",
        "description": "설명",
    },
    "nl": {
        "metadata": "metadata",
        "creditLine": "kredietregel",
        "source": "bron",
        "copyrightNotice": "copyrightmelding",
        "copyrightStatus": "copyrightstatus",
        "rightsUsageTerms": "gebruiksvoorwaarden",
        "altText": "alt-tekst",
        "alt": "alt",
        "extendedAlt": "uitgebreide alt-tekst",
        "caption": "onderschrift",
        "headline": "kop",
        "extendedDescription": "uitgebreide beschrijving",
        "description": "beschrijving",
    },
    "pl": {
        "metadata": "metadane",
        "creditLine": "linia kredytowa",
        "source": "źródło",
        "copyrightNotice": "informacja o prawach autorskich",
        "copyrightStatus": "status praw autorskich",
        "rightsUsageTerms": "warunki korzystania z praw",
        "altText": "tekst alternatywny",
        "alt": "alt",
        "extendedAlt": "rozszerzony tekst alternatywny",
        "caption": "podpis",
        "headline": "nagłówek",
        "extendedDescription": "rozszerzony opis",
        "description": "opis",
    },
    "pt": {
        "metadata": "metadados",
        "creditLine": "linha de crédito",
        "source": "fonte",
        "copyrightNotice": "aviso de direitos autorais",
        "copyrightStatus": "status de direitos autorais",
        "rightsUsageTerms": "termos de uso e direitos",
        "altText": "texto alternativo",
        "alt": "alt",
        "extendedAlt": "texto alternativo estendido",
        "caption": "legenda",
        "headline": "título",
        "extendedDescription": "descrição estendida",
        "description": "descrição",
    },
    "ru": {
        "metadata": "метаданные",
        "creditLine": "кредитная линия",
        "source": "источник",
        "copyrightNotice": "уведомление об авторских правах",
        "copyrightStatus": "статус авторских прав",
        "rightsUsageTerms": "условия использования прав",
        "altText": "альтернативный текст",
        "alt": "alt",
        "extendedAlt": "расширенный альтернативный текст",
        "caption": "подпись",
        "headline": "заголовок",
        "extendedDescription": "расширенное описание",
        "description": "описание",
    },
    "sw": {
        "metadata": "metadata",
        "creditLine": "mstari wa mkopo",
        "source": "chanzo",
        "copyrightNotice": "ilani ya hakimiliki",
        "copyrightStatus": "hali ya hakimiliki",
        "rightsUsageTerms": "masharti ya matumizi ya haki",
        "altText": "maandishi mbadala",
        "alt": "alt",
        "extendedAlt": "maandishi mbadala yaliyopanuliwa",
        "caption": "maelezo mafupi",
        "headline": "kichwa cha habari",
        "extendedDescription": "maelezo yaliyopanuliwa",
        "description": "maelezo",
    },
    "tr": {
        "metadata": "meta veri",
        "creditLine": "kredi hattı",
        "source": "kaynak",
        "copyrightNotice": "telif hakkı bildirimi",
        "copyrightStatus": "telif hakkı durumu",
        "rightsUsageTerms": "hak kullanım koşulları",
        "altText": "alt metin",
        "alt": "alt",
        "extendedAlt": "genişletilmiş alt metin",
        "caption": "altyazı",
        "headline": "manşet",
        "extendedDescription": "genişletilmiş açıklama",
        "description": "açıklama",
    },
    "ur": {
        "metadata": "میٹا ڈیٹا",
        "creditLine": "کریڈٹ لائن",
        "source": "ماخذ",
        "copyrightNotice": "کاپی رائٹ نوٹس",
        "copyrightStatus": "کاپی رائٹ حیثیت",
        "rightsUsageTerms": "حقوق اور استعمال کی شرائط",
        "altText": "متبادل متن",
        "alt": "آلٹ",
        "extendedAlt": "وسیع متبادل متن",
        "caption": "کیپشن",
        "headline": "سرخی",
        "extendedDescription": "موسع تفصیل",
        "description": "تفصیل",
    },
    "vi": {
        "metadata": "siêu dữ liệu",
        "creditLine": "dòng tín dụng",
        "source": "nguồn",
        "copyrightNotice": "thông báo bản quyền",
        "copyrightStatus": "trạng thái bản quyền",
        "rightsUsageTerms": "điều khoản sử dụng và quyền",
        "altText": "văn bản thay thế",
        "alt": "alt",
        "extendedAlt": "văn bản thay thế mở rộng",
        "caption": "chú thích",
        "headline": "tiêu đề",
        "extendedDescription": "mô tả mở rộng",
        "description": "mô tả",
    },
    "zh-Hans": {
        "metadata": "元数据",
        "creditLine": "署名行",
        "source": "来源",
        "copyrightNotice": "版权声明",
        "copyrightStatus": "版权状态",
        "rightsUsageTerms": "权利与使用条款",
        "altText": "替代文本",
        "alt": "Alt",
        "extendedAlt": "扩展替代文本",
        "caption": "标题",
        "headline": "标题",
        "extendedDescription": "扩展描述",
        "description": "描述",
    },
    "zh": {
        "metadata": "元資料",
        "creditLine": "署名行",
        "source": "來源",
        "copyrightNotice": "版權聲明",
        "copyrightStatus": "版權狀態",
        "rightsUsageTerms": "權利與使用條款",
        "altText": "替代文字",
        "alt": "Alt",
        "extendedAlt": "擴充替代文字",
        "caption": "標題",
        "headline": "標題",
        "extendedDescription": "擴充描述",
        "description": "描述",
    },
}


def load_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def dump_json(path: Path, data: dict) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main() -> None:
    base_path = I18N_DIR / f"{BASE_LANG}.json"
    en_data = load_json(base_path)
    en_labels = en_data["peak"]["metadata"]["labels"]
    base_keys = list(en_labels.keys())

    for path in sorted(I18N_DIR.glob("*.json")):
        if path.name == f"{BASE_LANG}.json":
            continue

        lang = path.stem
        data = load_json(path)
        labels = (
            data.setdefault("peak", {})
            .setdefault("metadata", {})
            .setdefault("labels", {})
        )

        for key in base_keys:
            en_value = en_labels[key]
            translation = TRANSLATIONS.get(lang, {}).get(key, "")

            if key not in labels or labels[key] == en_value:
                labels[key] = translation

        dump_json(path, data)


if __name__ == "__main__":
    main()
