import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://orpkcruejwanwpbyguev.supabase.co'
const supabaseKey = 'sb_publishable_XuZOUeTrEbxUw2qM9uM1BA_MyG8ljXY'

export const supabase = createClient(supabaseUrl, supabaseKey)
