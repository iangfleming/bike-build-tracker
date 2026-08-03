export function populateSwitcher(select, builds) {
  select.innerHTML = '';
  for (const build of builds) {
    const opt = document.createElement('option');
    opt.value = build.id;
    opt.textContent = build.name;
    select.appendChild(opt);
  }
}