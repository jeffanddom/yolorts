declare global {
  interface Window {
    hotReload: {
      enabled: boolean
      poll: (initialBuildkey: string) => void
      interval?: number
    }
  }
}

export const init = (opts: { enabled: boolean } = { enabled: true }): void => {
  window.hotReload = { enabled: opts.enabled, poll }
}

// This function will execute outside of the main client bundle, which means
// you should avoid using dependencies not available globally in the browser,
// as well as async/await.
export const poll = (initialBuildkey: string): void => {
  if (window.hotReload.interval !== undefined) {
    return
  }

  window.hotReload.interval = setInterval(() => {
    fetch('/api/buildkey')
      .then((response) => {
        if (response.status != 200) {
          throw new Error(
            'buildkey fetch: invalid status ' + response.status.toString(),
          )
        }

        return response.text()
      })
      .then((newBuildkey) => {
        if (newBuildkey.length > 0 && newBuildkey !== initialBuildkey) {
          console.log(
            'detected buildkey change from ' +
              initialBuildkey.toString() +
              ' to ' +
              newBuildkey.toString() +
              ', reloading...',
          )
          window.location.reload()
        }
      })
      .catch((err) => {
        console.log('buildkey fetch: error:', err)
      })
  }, 1000)
}

export const updateEntrypointHtmlForHotReload = (opts: {
  buildkey: string
  html: string
}): string => {
  return opts.html.replace(
    '<!-- DEV SERVER HOT RELOAD PLACEHOLDER -->',
    `
<script>
  window.buildkey = '${opts.buildkey}'
  console.log('buildkey: ' + window.buildkey)

  if (window.hotReload.enabled) {
    window.hotReload.poll(window.buildkey)
  }
</script>
`,
  )
}
