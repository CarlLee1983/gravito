/**
 * GitHub Webhook 模擬器
 * 模擬 GitHub 發送 pull_request 事件給 Launchpad
 */

const LAUNCHPAD_URL = 'http://localhost:4000/launch'

async function simulateWebhook(action: 'opened' | 'synchronize' | 'closed') {
  console.log(`\n🚀 正在模擬 GitHub Action: ${action.toUpperCase()}...`)

  const payload = {
    action: action,
    number: 19,
    pull_request: {
      number: 19,
      state: action === 'closed' ? 'closed' : 'open',
      head: {
        ref: 'feat/launchpad-github-bot',
        sha: '25837ad8225837ad8225837ad8225837ad825837',
      },
      base: {
        repo: {
          name: 'gravito',
          owner: { login: 'gravito-framework' },
          clone_url: 'https://github.com/gravito-framework/gravito.git',
        },
      },
    },
  }

  try {
    const response = await fetch(LAUNCHPAD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'pull_request',
        'X-Hub-Signature-256': 'sha256=MOCK_SIGNATURE', // 模擬簽名
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()
    console.log('✅ Launchpad 回應:', JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('❌ 模擬失敗:', error)
  }
}

// 執行模擬流程
async function runTest() {
  // 1. 模擬開啟 PR (觸發部署)
  await simulateWebhook('opened')
}

runTest()
