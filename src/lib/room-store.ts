import { Category, MealRoom, Participant, Restaurant, Vote, VoteValue } from "../types";
import { supabase } from "./supabase";
import { cacheLastRoom, getCachedRoom } from "./room-cache";

export const categories: Category[] = ["한식", "양식", "중식", "일식", "피자", "마라탕", "술집", "상관없음"];
const demoId = "demo";
const samples = [{ id:"pizza", name:"이츠오케이피자", category:"피자", price:15000, description:"여럿이 나눠 먹기 좋은 피자" }, { id:"mara", name:"샤로수길 마라탕", category:"마라탕", price:13000, description:"매콤한 메뉴" }, { id:"gukbap", name:"서울대입구 국밥집", category:"한식", price:10000, description:"든든하고 빠른 한 끼" }, { id:"pasta", name:"샤로수길 파스타", category:"양식", price:18000, description:"조용한 밥약" }, { id:"tonkatsu", name:"돈카츠집", category:"일식", price:14000, description:"무난한 선택" }] as Omit<Restaurant, "roomId">[];
export const sampleRestaurants = samples.map((place) => ({ ...place, roomId: "" }));
const demoParticipants: Participant[] = ["동진", "민지", "준호"].map((nickname, index) => ({ id:`demo-p${index}`, roomId:demoId, nickname }));
const rawDemoVotes: [number, string, VoteValue][] = [[0,"pizza","love"],[0,"mara","okay"],[0,"gukbap","okay"],[0,"pasta","love"],[0,"tonkatsu","okay"],[1,"pizza","love"],[1,"mara","dislike"],[1,"gukbap","okay"],[1,"pasta","okay"],[1,"tonkatsu","love"],[2,"pizza","okay"],[2,"mara","cannot"],[2,"gukbap","love"],[2,"pasta","okay"],[2,"tonkatsu","okay"]];
const demoRoom = (): MealRoom => ({ id:demoId, name:"금요일 저녁 밥약", region:"서울대입구", people:3, time:"금요일 19:00", budget:"1~2만원", foodTypes:["상관없음"], restaurants:samples.map((item) => ({ ...item, roomId:demoId })), participants:demoParticipants, votes:rawDemoVotes.map(([p, restaurantId, value], index) => ({ id:`v${index}`, roomId:demoId, participantId:demoParticipants[p].id, restaurantId, value })), createdAt:"2026-09-29T00:00:00.000Z" });
export const newId = () => crypto.randomUUID();

function dbRoom(row: Record<string, unknown>, restaurants: Restaurant[], participants: Participant[], votes: Vote[]): MealRoom { return { id:row.id as string, name:row.name as string, region:row.region as string, people:Number(row.people), time:row.meal_time as string, budget:row.budget as MealRoom["budget"], foodTypes:(row.food_types as Category[]) ?? ["상관없음"], restaurants, participants, votes, createdAt:row.created_at as string }; }
export async function loadRoom(id: string): Promise<MealRoom | null> {
  if (id === demoId) return demoRoom();
  if (!supabase) return getCachedRoom(id);
  try {
    const { data: room, error } = await supabase.from("rooms").select("*").eq("id", id).single();
    if (error || !room) return null;
    const [restaurants, participants, votes] = await Promise.all([supabase.from("restaurants").select("*").eq("room_id",id), supabase.from("participants").select("*").eq("room_id",id), supabase.from("votes").select("*").eq("room_id",id)]);
    const hydrated = dbRoom(room, (restaurants.data ?? []).map((r) => ({ id:r.id, roomId:r.room_id, name:r.name, category:r.category, price:r.price, description:r.description })), (participants.data ?? []).map((p) => ({ id:p.id, roomId:p.room_id, nickname:p.nickname })), (votes.data ?? []).map((v) => ({ id:v.id, roomId:v.room_id, participantId:v.participant_id, restaurantId:v.restaurant_id, value:v.value })));
    await cacheLastRoom(hydrated);
    return hydrated;
  } catch { return getCachedRoom(id); }
}
export async function createRoom(room: MealRoom) { const client = supabase; if (!client) throw new Error("Supabase 환경변수가 설정되지 않았어요."); const { error } = await client.from("rooms").insert({ id:room.id, name:room.name, region:room.region, people:room.people, meal_time:room.time, budget:room.budget, food_types:room.foodTypes }); if (error) throw error; const { error: placesError } = await client.from("restaurants").insert(room.restaurants.map((r) => ({ id:r.id, room_id:room.id, name:r.name, category:r.category, price:r.price, description:r.description }))); if (placesError) throw placesError; }
export async function ensureParticipant(roomId: string, nickname: string): Promise<Participant> { const client = supabase; if (!client) throw new Error("Supabase 환경변수가 설정되지 않았어요."); const name = nickname.trim() || "익명"; const { data: existing, error: lookupError } = await client.from("participants").select("id, room_id, nickname").eq("room_id", roomId).eq("nickname", name).maybeSingle(); if (lookupError) throw lookupError; if (existing) return { id:existing.id, roomId:existing.room_id, nickname:existing.nickname }; const participant = { id:newId(), roomId, nickname:name }; const { error } = await client.from("participants").insert({ id:participant.id, room_id:roomId, nickname:participant.nickname }); if (error) throw error; return participant; }
export async function saveVote(room: MealRoom, participant: Participant, restaurantId: string, value: VoteValue) { const client = supabase; if (!client) throw new Error("Supabase 환경변수가 설정되지 않았어요."); const { error } = await client.from("votes").upsert({ room_id:room.id, participant_id:participant.id, restaurant_id:restaurantId, value }, { onConflict:"participant_id,restaurant_id" }); if (error) throw error; }
export function subscribeToRoom(roomId: string, refresh: () => void) { const client = supabase; if (!client) return () => {}; const channel = client.channel(`room-${roomId}`).on("postgres_changes", { event:"*", schema:"public", table:"restaurants", filter:`room_id=eq.${roomId}` }, refresh).on("postgres_changes", { event:"*", schema:"public", table:"participants", filter:`room_id=eq.${roomId}` }, refresh).on("postgres_changes", { event:"*", schema:"public", table:"votes", filter:`room_id=eq.${roomId}` }, refresh).subscribe(); return () => { void client.removeChannel(channel); }; }
