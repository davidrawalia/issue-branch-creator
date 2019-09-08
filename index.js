module.exports = app => {
  app.log('App was loaded')

  app.on('issues.labeled', async context => {
    app.log('Issue was opened')
    const owner = context.payload.repository.owner.login
    const repo = context.payload.repository.name
    const issueNumber = context.payload.issue.number
    const issueTitle = context.payload.issue.title
    const issueLabel = context.payload.label.name
    app.log(`Issue label: ${issueLabel}`)
    const branchName = await getBranchNameFromIssue(context, issueNumber, issueTitle, issueLabel)
    if (await branchExists(context, owner, repo, branchName)) {
      app.log('Branch already exists')
    } else {
      const sha = await getDefaultBranchHeadSha(context, owner, repo)
      await createBranch(context, owner, repo, branchName, sha)
      app.log(`Branch created: ${branchName}`)
    }
  })
}

async function branchExists (context, owner, repo, branchName) {
  try {
    await context.github.gitdata.getRef({
      'owner': owner, 'repo': repo, ref: `heads/${branchName}`
    })
    return true
  } catch (err) {
    return false
  }
}

async function getDefaultBranchHeadSha (context, owner, repo) {
  const defaultBranch = context.payload.repository.default_branch
  const res = await context.github.gitdata.getRef({
    owner: owner, repo: repo, ref: `heads/${defaultBranch}`
  })
  const ref = res.data.object
  return ref.sha
}

async function createBranch (context, owner, repo, branchName, sha) {
  const res = await context.github.gitdata.createRef({
    'owner': owner, 'repo': repo, 'ref': `refs/heads/${branchName}`, 'sha': sha
  })
  return res
}

async function getBranchNameFromIssue (context, number, title, label) {
  let branchTitle = title.replace(/[\W]+/g, '_')
  if (branchTitle.endsWith('_')) {
    branchTitle = branchTitle.slice(0, -1)
  }
  return `${label}-${number}-${branchTitle}`
}
