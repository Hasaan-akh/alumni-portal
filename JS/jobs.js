async function init() {
  const me = await requireAccess("verified");
  if (!me) return;   // the user was redirected, so stop here

  
}

init();

// the rest of the jobs code goes below this line