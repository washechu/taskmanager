import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function seed() {
  console.log('Seeding database...')

  const projects = [
    {
      title: 'Продать квартиру',
      status: 'in_progress',
      category: 'personal',
      description: 'Подготовка документов, поиск покупателя, сделка',
    },
    {
      title: 'Вылечить зубы',
      status: 'in_progress',
      category: 'personal',
      description: 'Плановое лечение и профилактика',
    },
  ]

  const { data, error } = await supabase.from('projects').insert(projects).select()
  if (error) {
    console.error('Error seeding projects:', error)
  } else {
    console.log(`Created ${data.length} projects`)
  }

  console.log('Done!')
}

seed()
