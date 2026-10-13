import { brandMenus } from "../data/brand-menus";
import type { NearbyRestaurant } from "./nearby-restaurants";

export type MenuEvidence = "official-brand" | "registered-cuisine" | "name-inferred" | "category-example" | "unknown";
export interface RestaurantMenu {
  summary: string;
  evidence: MenuEvidence;
  mains: string[];
  sides: string[];
  signature?: string;
  sources: { label: string; url: string }[];
  checkedAt?: string;
}

type MenuPlace = Pick<NearbyRestaurant, "name" | "category" | "cuisine" | "brand">;
interface DishRule { name: string; namePattern: RegExp; cuisineTags: string[]; sides: string[] }

// These are food-type hints and pairing ideas, NEVER a restaurant's verified menu or popularity.
const dishRules: DishRule[] = [
  { name: "마라탕", namePattern: /마라탕|malatang/i, cuisineTags: ["malatang"], sides: ["꿔바로우"] },
  { name: "마라샹궈", namePattern: /마라샹궈/, cuisineTags: ["mala_xiang_guo"], sides: ["공깃밥"] },
  { name: "피자", namePattern: /피자|pizza/i, cuisineTags: ["pizza"], sides: ["샐러드", "감자튀김"] },
  { name: "버거", namePattern: /버거|burger|맥도날드|롯데리아/i, cuisineTags: ["burger"], sides: ["감자튀김"] },
  { name: "치킨", namePattern: /치킨|통닭|chicken/i, cuisineTags: ["chicken", "fried_chicken"], sides: ["감자튀김", "치즈볼"] },
  { name: "돈카츠", namePattern: /돈[가까카]스|돈[가카]츠|tonkatsu/i, cuisineTags: ["tonkatsu"], sides: ["우동", "새우튀김"] },
  { name: "초밥", namePattern: /초밥|스시|sushi/i, cuisineTags: ["sushi"], sides: ["우동", "튀김"] },
  { name: "라멘", namePattern: /라멘|ramen/i, cuisineTags: ["ramen"], sides: ["교자"] },
  { name: "우동", namePattern: /우동|udon/i, cuisineTags: ["udon"], sides: ["튀김"] },
  { name: "규동", namePattern: /규동/, cuisineTags: ["gyudon"], sides: ["미소국"] },
  { name: "텐동", namePattern: /텐동/, cuisineTags: ["tendon"], sides: ["미소국"] },
  { name: "파스타", namePattern: /파스타|pasta/i, cuisineTags: ["pasta"], sides: ["샐러드", "마늘빵"] },
  { name: "스테이크", namePattern: /스테이크|steak/i, cuisineTags: ["steak", "steak_house"], sides: ["샐러드", "구운 채소"] },
  { name: "쌀국수", namePattern: /쌀국수|\bpho\b/i, cuisineTags: ["pho"], sides: ["짜조", "스프링롤"] },
  { name: "카레", namePattern: /카레|커리|curry/i, cuisineTags: ["curry"], sides: ["샐러드"] },
  { name: "국밥", namePattern: /국밥|순[대댓]국/, cuisineTags: ["gukbap"], sides: ["수육"] },
  { name: "칼국수", namePattern: /칼국수/, cuisineTags: ["kalguksu"], sides: ["만두"] },
  { name: "냉면", namePattern: /냉면/, cuisineTags: ["naengmyeon"], sides: ["만두"] },
  { name: "국수", namePattern: /(?<!칼|쌀)국수/, cuisineTags: ["noodle"], sides: ["만두"] },
  { name: "찌개", namePattern: /찌개/, cuisineTags: ["jjigae"], sides: ["계란말이"] },
  { name: "감자탕", namePattern: /감자탕/, cuisineTags: ["gamjatang"], sides: ["볶음밥"] },
  { name: "곰탕·설렁탕", namePattern: /곰탕|설렁탕/, cuisineTags: ["gomtang", "seolleongtang"], sides: ["수육"] },
  { name: "보쌈", namePattern: /보쌈/, cuisineTags: ["bossam"], sides: ["막국수"] },
  { name: "족발", namePattern: /족발/, cuisineTags: ["jokbal"], sides: ["막국수"] },
  { name: "고기구이", namePattern: /삼겹|(?<!닭)갈비|고깃집|고기집|한우/, cuisineTags: ["korean_barbecue", "bbq"], sides: ["냉면", "된장찌개"] },
  { name: "곱창", namePattern: /곱창|막창|대창/, cuisineTags: ["gopchang"], sides: ["볶음밥"] },
  { name: "닭갈비", namePattern: /닭갈비/, cuisineTags: ["dakgalbi"], sides: ["볶음밥"] },
  { name: "김밥", namePattern: /김밥/, cuisineTags: ["kimbap", "gimbap"], sides: ["라면", "떡볶이"] },
  { name: "떡볶이", namePattern: /떡볶이|떡복이|toppokki/i, cuisineTags: ["toppokki", "tteokbokki"], sides: ["튀김", "순대"] },
  { name: "만두", namePattern: /만두/, cuisineTags: ["dumpling"], sides: ["국수"] },
  { name: "짜장면", namePattern: /짜장|자장/, cuisineTags: ["jjajangmyeon"], sides: ["탕수육", "군만두"] },
  { name: "짬뽕", namePattern: /짬뽕/, cuisineTags: ["jjamppong"], sides: ["탕수육", "군만두"] },
  { name: "양꼬치", namePattern: /양꼬치/, cuisineTags: ["lamb_skewer"], sides: ["볶음밥"] },
  { name: "회·참치", namePattern: /횟집|참치|사시미/, cuisineTags: ["sashimi"], sides: ["매운탕"] },
];

const categoryExamples: Record<NearbyRestaurant["category"], { mains: string[]; sides: string[] }> = {
  한식: { mains: ["백반", "찌개", "비빔밥"], sides: ["계란말이", "전"] },
  양식: { mains: ["파스타", "스테이크"], sides: ["샐러드", "마늘빵"] },
  중식: { mains: ["짜장면", "짬뽕", "볶음밥"], sides: ["탕수육", "군만두"] },
  일식: { mains: ["초밥", "돈카츠", "덮밥"], sides: ["우동", "튀김"] },
  분식: { mains: ["김밥", "떡볶이"], sides: ["튀김", "순대"] },
  피자: { mains: ["피자"], sides: ["샐러드", "감자튀김"] },
  마라탕: { mains: ["마라탕"], sides: ["꿔바로우"] },
  버거: { mains: ["버거"], sides: ["감자튀김"] },
  기타: { mains: [], sides: [] },
};

export function safeMenuUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

const normalized = (value: string) => value.toLowerCase().replace(/[\s'’._-]/g, "");

function matchesBrand(place: MenuPlace, aliases: string[]) {
  const brand = normalized(place.brand || ""), name = normalized(place.name);
  return aliases.some((alias) => {
    const key = normalized(alias);
    if (brand === key || name === key) return true;
    if (!name.startsWith(key)) return false;
    const suffix = name.slice(key.length);
    // Match a named branch, not an unrelated restaurant mentioning a chain in its name.
    return !/옆|맞은편|스타일/.test(suffix) && /^(?:\d{4})?\(?[가-힣a-z0-9]+(?:지점|점)\)?$/.test(suffix);
  });
}

export function getRestaurantMenu(place: MenuPlace): RestaurantMenu {
  const official = brandMenus.find((menu) => matchesBrand(place, menu.aliases));
  if (official) return { ...official, evidence: "official-brand" };

  const cuisine = (place.cuisine || "").toLowerCase().split(/[;,]/).map((tag) => tag.trim());
  const registered = dishRules.filter((rule) => rule.cuisineTags.some((tag) => cuisine.includes(tag)));
  const fromName = dishRules.filter((rule) => rule.namePattern.test(place.name));
  const rules = registered.length ? registered : fromName;
  if (rules.length) {
    const mains = [...new Set(rules.map((rule) => rule.name))].slice(0, 3);
    const sides = [...new Set(rules.flatMap((rule) => rule.sides))].filter((dish) => !mains.includes(dish)).slice(0, 3);
    return {
      summary: registered.length ? `등록된 음식 종류는 ${mains.join("·")} 계열이에요.` : `${mains.join("·")} 계열의 음식을 파는 곳으로 예상돼요.`,
      evidence: registered.length ? "registered-cuisine" : "name-inferred", mains, sides, sources: [],
    };
  }

  const example = categoryExamples[place.category];
  if (example.mains.length) return {
    summary: `${place.category} 식당으로 분류했어요. 아래는 이 종류에서 흔히 먹는 메뉴 예시예요.`,
    evidence: "category-example", ...example, sources: [],
  };
  return { summary: "아직 어떤 음식을 파는지 확인되지 않았어요.", evidence: "unknown", mains: [], sides: [], sources: [] };
}
