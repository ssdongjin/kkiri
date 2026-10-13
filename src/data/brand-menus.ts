export interface BrandMenu {
  aliases: string[];
  summary: string;
  mains: string[];
  sides: string[];
  signature?: string;
  sources: { label: string; url: string }[];
  checkedAt: string;
}

// Small, curated catalogue of official brand menus, not branch availability or review rankings.
// Only add a signature when the linked official source explicitly calls it representative/signature.
export const brandMenus: BrandMenu[] = [
  {
    aliases: ["홍콩반점0410", "홍콩반점"],
    summary: "짬뽕·짜장면을 중심으로 하는 중식 브랜드예요.",
    mains: ["짬뽕", "짜장면", "볶음밥"],
    sides: ["탕수육", "군만두"],
    signature: "짬뽕 · 공식 소개의 대표 메뉴",
    sources: [{ label: "홍콩반점 공식 메뉴", url: "https://www.theborn.co.kr/theborn_brand/홍콩반점2/" }],
    checkedAt: "2026-10-13",
  },
  {
    aliases: ["맘스터치", "momstouch"],
    summary: "치킨 패티 버거와 치킨을 판매하는 브랜드예요.",
    mains: ["싸이버거", "불싸이버거", "통새우버거"],
    sides: ["케이준양념감자", "할라피뇨너겟"],
    signature: "싸이버거 · 공식 소개의 시그니처",
    sources: [{ label: "맘스터치 공식 메뉴", url: "https://order.momstouch.co.kr/momsmall/menu.jsp?menu_cd=001" }],
    checkedAt: "2026-10-13",
  },
  {
    aliases: ["교촌치킨", "kyochonchicken", "kyochon"],
    summary: "간장·허니·레드 소스 치킨을 판매하는 브랜드예요.",
    mains: ["허니콤보", "간장한마리", "레드한마리"],
    sides: ["웨지감자", "달걀듬뿍볶음밥"],
    sources: [
      { label: "교촌 공식 치킨 메뉴", url: "https://www.kyochon.com/menu/chicken_cnttech.asp" },
      { label: "교촌 공식 사이드 메뉴", url: "https://www.kyochon.com/menu/side.asp" },
    ],
    checkedAt: "2026-10-13",
  },
];
