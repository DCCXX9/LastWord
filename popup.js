chrome.storage.local.get(['rules', 'settings']).then(data => {
  const count = Object.values(data.rules || {}).reduce(
    (total, group) => total + Object.keys(group || {}).length, 0
  );
  document.getElementById('summary').textContent =
    (data.settings?.username || 'No profile set') + ' · ' +
    count + (count === 1 ? ' display rule' : ' display rules');
});
document.getElementById('options').addEventListener('click', () =>
  chrome.runtime.openOptionsPage()
);
