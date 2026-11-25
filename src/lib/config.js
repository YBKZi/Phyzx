// Valori pubblici (chiave "anon" di Supabase): il database è chiuso e risponde solo alle funzioni phyzx_pull / phyzx_push con la chiave giusta.
export const SUPABASE_URL = 'https://qprnxbypcoofdnpsngbv.supabase.co';
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwcm54YnlwY29vZmRucHNuZ2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NzY5MjQsImV4cCI6MjEwMDE1MjkyNH0.lFQnb7pdJ_ghVmHFMFeu_XraouB8URjtriT1gYEeaCE';
// Chiave pubblica VAPID per le notifiche push (la privata resta solo nel database, accessibile alla funzione di invio)
export const VAPID_PUBLIC = 'BNurYBuzrufdcYSnOgIT-FQMI3ClqzQRR0qL5jdZ0DInJktRuvRxOPJrdADSM7DdEura63DDvpEdCz-aNCjomgE';
