export async function POST(req) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'No IPFS Key configured' }), { status: 500 });
  }

  try {
    const jsonData = await req.json();
    
    const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`
      },
      body: JSON.stringify({
        pinataContent: jsonData,
        pinataMetadata: {
          name: "KodeBattle_DAO_Proposal_" + Date.now()
        }
      })
    });
    
    const result = await res.json();
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    console.error("IPFS API Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
