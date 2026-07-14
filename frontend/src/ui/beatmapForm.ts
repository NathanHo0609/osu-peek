export function setupBeatmapForm(
  form: HTMLFormElement,
  onSubmit: (query: string) => void,
): void {
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const input = form.querySelector<HTMLInputElement>('input[name="query"]')!
    const query = input.value.trim()
    if (query) onSubmit(query)
  })
}
