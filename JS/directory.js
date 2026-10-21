async function init() {
  const me = await requireAccess("verified");
  if (!me) return;   // the user was redirected, so stop here

  // the rest of the directory code goes below this line
}

init();