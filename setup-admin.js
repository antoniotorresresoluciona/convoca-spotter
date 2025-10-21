import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://cvihbwqujqupnhzvtosf.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2aWhid3F1anF1cG5oenZ0b3NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTY3NTUsImV4cCI6MjA3NTQ5Mjc1NX0.iSFRDry1DXBoXTdKE2dQnzLXM6I2gI5Lasnm1-OuylY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupAdmin() {
  try {
    console.log('🔐 Configurando usuario admin...');

    const username = 'admin';
    const password = 'admin123';

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('✅ Contraseña hasheada');

    // Check if user exists
    const { data: existing, error: selectError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') {
      throw selectError;
    }

    if (existing) {
      // Update existing user
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ password_hash: passwordHash })
        .eq('username', username);

      if (updateError) throw updateError;
      console.log('✅ Usuario admin actualizado');
    } else {
      // Insert new user
      const { error: insertError } = await supabase
        .from('admin_users')
        .insert({ username, password_hash: passwordHash });

      if (insertError) throw insertError;
      console.log('✅ Usuario admin creado');
    }

    console.log('\n🎉 Configuración completada!');
    console.log('👤 Usuario: admin');
    console.log('🔑 Contraseña: admin123');
    console.log('\nPuedes acceder en: http://localhost:4173/admin/login\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nDetalles del error:', error);
    process.exit(1);
  }
}

setupAdmin();
