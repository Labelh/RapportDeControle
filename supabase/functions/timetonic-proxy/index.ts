// Supabase Edge Function - Proxy pour API Timetonic
// Résout le problème CORS en faisant l'intermédiaire entre le frontend et Timetonic

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const TIMETONIC_API_URL = 'https://timetonic.com/live/api.php'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Gérer les requêtes OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Récupérer les paramètres de la requête
    const { params } = await req.json()

    console.log('Proxy Timetonic - Requête reçue:', {
      req: params.req,
      o_u: params.o_u,
      u_c: params.u_c,
    })

    // Créer les paramètres URL-encoded pour Timetonic
    const formData = new URLSearchParams(params)

    // Appeler l'API Timetonic
    const response = await fetch(TIMETONIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    const contentType = response.headers.get('content-type')
    console.log('Timetonic réponse - Status:', response.status, 'Content-Type:', contentType)

    // Vérifier que la réponse est bien du JSON
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      console.error('Timetonic a renvoyé du non-JSON:', text.substring(0, 200))

      return new Response(
        JSON.stringify({
          status: 'error',
          errorMsg: 'Timetonic a renvoyé une réponse invalide (non-JSON)',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const data = await response.json()
    console.log('Timetonic réponse - Status API:', data.status)

    // Renvoyer la réponse de Timetonic au client
    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Erreur dans le proxy Timetonic:', error)

    return new Response(
      JSON.stringify({
        status: 'error',
        errorMsg: error.message || 'Erreur interne du proxy',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
