async function init() {
  const me = await requireAccess("login");
  if (!me) return;   
}

init();