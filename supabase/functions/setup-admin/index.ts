// Script único para configurar el admin inicial
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { hash } from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Configurando usuario admin...');

const username = 'admin';
const password = 'admin123';
const passwordHash = await hash(password);

// Eliminar admin existente si hay
await supabase.from('admin_users').delete().eq('username', username);

// Insertar nuevo admin con hash correcto
const { error } = await supabase
  .from('admin_users')
  .insert({ username, password_hash: passwordHash });

if (error) {
  console.error('Error:', error);
} else {
  console.log('✅ Usuario admin configurado correctamente');
  console.log('Username: admin');
  console.log('Password: admin123');
}
