import { supabase } from '../lib/supabase'

export interface UserProfile {
  id: string
  full_name: string | null
  phone: string | null
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles').select('id, full_name, phone').eq('id', userId).maybeSingle()
  return { data: data as UserProfile | null, error }
}

export async function updateUserProfile(userId: string, payload: { fullName: string; phone: string }) {
  const normalizedPayload = { id: userId, full_name: payload.fullName, phone: payload.phone }
  const profileResult = await supabase
    .from('profiles').upsert(normalizedPayload).select('id, full_name, phone').single()

  if (!profileResult.error) {
    void supabase.auth.updateUser({ data: { full_name: payload.fullName, phone: payload.phone } }).catch(() => {})
  }

  return { data: profileResult.data as UserProfile | null, error: profileResult.error }
}
