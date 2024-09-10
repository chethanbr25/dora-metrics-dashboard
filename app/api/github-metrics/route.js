// app/api/github-metrics/route.js
import { NextResponse } from 'next/server';
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

const owner = "chethanbr25";
const repo = "my-component-library";

async function fetchDeploymentFrequency(days = 30) {
  const { data: deployments } = await octokit.repos.listDeployments({
    owner,
    repo,
    per_page: 100,
  });

  const recentDeployments = deployments.filter(
    (deployment) =>
      new Date(deployment.created_at) > new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  );

  return recentDeployments.length / (days / 7); // per week
}

async function fetchLeadTimeForChanges(days = 30) {
  const { data: pullRequests } = await octokit.pulls.list({
    owner,
    repo,
    state: "closed",
    sort: "updated",
    direction: "desc",
    per_page: 100,
  });

  const recentPRs = pullRequests.filter(
    (pr) =>
      new Date(pr.closed_at) > new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  );

  const leadTimes = await Promise.all(
    recentPRs.map(async (pr) => {
      const { data: commits } = await octokit.pulls.listCommits({
        owner,
        repo,
        pull_number: pr.number,
      });
      const firstCommitDate = new Date(commits[0].commit.author.date);
      const mergeDate = new Date(pr.merged_at);
      return (mergeDate - firstCommitDate) / (1000 * 60 * 60); // in hours
    })
  );

  return leadTimes.reduce((sum, time) => sum + time, 0) / leadTimes.length;
}

async function fetchChangeFailureRate(days = 30) {
  const { data: issues } = await octokit.issues.listForRepo({
    owner,
    repo,
    state: "all",
    labels: "bug",
    since: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
  });

  const { data: pullRequests } = await octokit.pulls.list({
    owner,
    repo,
    state: "closed",
    sort: "updated",
    direction: "desc",
    per_page: 100,
  });

  const recentPRs = pullRequests.filter(
    (pr) =>
      new Date(pr.closed_at) > new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  );

  return (issues.length / recentPRs.length) * 100; // percentage
}

async function fetchTimeToRestoreService(days = 30) {
  const { data: issues } = await octokit.issues.listForRepo({
    owner,
    repo,
    state: "closed",
    labels: "bug",
    since: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
  });

  const restorationTimes = issues.map((issue) => {
    const createdAt = new Date(issue.created_at);
    const closedAt = new Date(issue.closed_at);
    return (closedAt - createdAt) / (1000 * 60 * 60); // in hours
  });

  return restorationTimes.reduce((sum, time) => sum + time, 0) / restorationTimes.length;
}

async function fetchCodeQuality() {
  // This is a placeholder. You might want to integrate with a code quality tool like SonarQube
  return Math.random() * 20 + 80; // Random value between 80 and 100
}

async function fetchImpact() {
  // This is a placeholder. You might want to define your own impact metrics
  return Math.random() * 20 + 80; // Random value between 80 and 100
}

async function fetchCollaboration() {
  const { data: pullRequests } = await octokit.pulls.list({
    owner,
    repo,
    state: "all",
    per_page: 100,
  });

  const totalReviews = await Promise.all(
    pullRequests.map(async (pr) => {
      const { data: reviews } = await octokit.pulls.listReviews({
        owner,
        repo,
        pull_number: pr.number,
      });
      return reviews.length;
    })
  );

  const averageReviews = totalReviews.reduce((sum, reviews) => sum + reviews, 0) / pullRequests.length;
  return Math.min(averageReviews * 20, 100); // Scale to 0-100
}

async function fetchGrowth(days = 30) {
  const { data: commits } = await octokit.repos.listCommits({
    owner,
    repo,
    since: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
  });

  const commitCounts = {};
  commits.forEach((commit) => {
    const author = commit.author ? commit.author.login : commit.commit.author.name;
    commitCounts[author] = (commitCounts[author] || 0) + 1;
  });

  const contributorCount = Object.keys(commitCounts).length;
  return Math.min(contributorCount * 10, 100); // Scale to 0-100
}

export async function GET() {
  try {
    const [
      deploymentFrequency,
      leadTime,
      changeFailureRate,
      timeToRestore,
      codeQuality,
      impact,
      collaboration,
      growth
    ] = await Promise.all([
      fetchDeploymentFrequency(),
      fetchLeadTimeForChanges(),
      fetchChangeFailureRate(),
      fetchTimeToRestoreService(),
      fetchCodeQuality(),
      fetchImpact(),
      fetchCollaboration(),
      fetchGrowth()
    ]);

    return NextResponse.json({
      deploymentFrequency,
      leadTime,
      changeFailureRate,
      timeToRestore,
      codeQuality,
      impact,
      collaboration,
      growth
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}