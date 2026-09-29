export type Category = "한식" | "양식" | "중식" | "일식" | "피자" | "마라탕" | "술집" | "상관없음";
export type Budget = "1만원 이하" | "1~2만원" | "2~3만원" | "상관없음";
export type VoteValue = "love" | "okay" | "dislike" | "cannot";
export interface Restaurant { id: string; roomId: string; name: string; category: Category; price: number; description: string; }
export interface Participant { id: string; roomId: string; nickname: string; }
export interface Vote { id?: string; roomId: string; participantId: string; restaurantId: string; value: VoteValue; }
export interface MealRoom { id: string; name: string; region: string; people: number; time: string; budget: Budget; foodTypes: Category[]; restaurants: Restaurant[]; participants: Participant[]; votes: Vote[]; createdAt: string; }
export interface RankedRestaurant { restaurant: Restaurant; score: number; loveCount: number; okayCount: number; dislikeCount: number; excluded: boolean; reason: string; }
