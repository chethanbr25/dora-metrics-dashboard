// src/app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Octokit } from "@octokit/rest";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { startOfWeek, endOfWeek, subWeeks, format, parseISO } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// import { DateRangePicker } from "@/components/ui/date-range-picker";

// Initialize Octokit
const octokit = new Octokit({ auth: process.env.NEXT_PUBLIC_GITHUB_TOKEN });

const REPO_OWNER = "chethanbr25";
const REPO_NAME = "my-component-library";

interface Metric {
  name: string;
  value: number;
}

interface Contributor {
  login: string;
  contributions: number;
}

interface DateRange {
  from: Date;
  to: Date;
}

const fetchGitHubData = async (dateRange: DateRange) => {
  try {
    const [commits, pullRequests, issues, contributors] = await Promise.all([
      octokit.repos.listCommits({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        since: dateRange.from.toISOString(),
        until: dateRange.to.toISOString(),
        per_page: 100,
      }),
      octokit.pulls.list({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        state: "all",
        sort: "updated",
        direction: "desc",
        per_page: 100,
      }),
      octokit.issues.listForRepo({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        state: "all",
        since: dateRange.from.toISOString(),
        per_page: 100,
      }),
      octokit.repos.listContributors({
        owner: REPO_OWNER,
        repo: REPO_NAME,
      }),
    ]);

    return {
      commits: commits.data,
      pullRequests: pullRequests.data,
      issues: issues.data,
      contributors: contributors.data as Contributor[],
    };
  } catch (error) {
    console.error("Error fetching GitHub data:", error);
    return { commits: [], pullRequests: [], issues: [], contributors: [] };
  }
};

const processMetrics = (
  data: {
    commits: any[];
    pullRequests: any[];
    issues: any[];
    contributors: Contributor[];
  },
  dateRange: DateRange
) => {
  const { commits, pullRequests, issues, contributors } = data;
  const daysInRange =
    (dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24);
  const weeksInRange = daysInRange / 7;

  const metrics = contributors.map((contributor) => {
    const contributorCommits = commits.filter(
      (commit) => commit.author?.login === contributor.login
    );
    const contributorPRs = pullRequests.filter(
      (pr) => pr.user?.login === contributor.login && pr.merged_at
    );
    const contributorIssues = issues.filter(
      (issue) => issue.user?.login === contributor.login
    );

    // Deployment Frequency: Number of PRs merged per week
    const deploymentFrequency = contributorPRs.length / weeksInRange;

    // Lead Time for Changes: Average time between first commit and PR merge
    const leadTimes = contributorPRs.map((pr) => {
      const firstCommitDate = new Date(
        contributorCommits.find((commit) => commit.sha === pr.base.sha)?.commit
          .author.date || pr.created_at
      );
      const mergedDate = new Date(pr.merged_at!);
      return (
        (mergedDate.getTime() - firstCommitDate.getTime()) /
        (1000 * 60 * 60 * 24)
      );
    });
    const leadTime =
      leadTimes.length > 0
        ? leadTimes.reduce((sum, time) => sum + time, 0) / leadTimes.length
        : 0;

    // Time to Restore: Average time to close issues (as a proxy)
    const restoreTimes = contributorIssues
      .filter((issue) => issue.closed_at)
      .map((issue) => {
        const createdDate = new Date(issue.created_at);
        const closedDate = new Date(issue.closed_at!);
        return (
          (closedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60)
        );
      });
    const timeToRestore =
      restoreTimes.length > 0
        ? restoreTimes.reduce((sum, time) => sum + time, 0) /
          restoreTimes.length
        : 0;

    // Change Failure Rate: Ratio of reverted PRs to total PRs (as a proxy)
    const revertedPRs = contributorPRs.filter((pr) =>
      pr.title.toLowerCase().includes("revert")
    );
    const changeFailureRate =
      contributorPRs.length > 0
        ? (revertedPRs.length / contributorPRs.length) * 100
        : 0;

    // Code Quality: Use number of comments on PRs as a proxy (lower is better)
    const prComments = contributorPRs.reduce((sum, pr) => sum + pr.comments, 0);
    const codeQuality =
      contributorPRs.length > 0
        ? 100 - prComments / contributorPRs.length
        : 100;

    // Impact: Number of issues closed
    const impact = contributorIssues.filter(
      (issue) => issue.state === "closed"
    ).length;

    // Collaboration: Number of PR reviews
    const collaboration = contributorPRs.reduce(
      (sum, pr) => sum + pr.review_comments,
      0
    );

    // Growth: Number of unique files changed
    const uniqueFilesChanged = new Set(
      contributorCommits.flatMap(
        (commit) => commit.files?.map((file) => file.filename) || []
      )
    );
    const growth = uniqueFilesChanged.size;

    return {
      name: contributor.login,
      deploymentFrequency,
      leadTime,
      timeToRestore,
      changeFailureRate,
      codeQuality,
      impact,
      collaboration,
      growth,
    };
  });

  return metrics;
};

const MetricCard = ({
  title,
  data,
  dataKey,
  unit,
}: {
  title: string;
  data: any[];
  dataKey: string;
  unit: string;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey={dataKey} fill="#8884d8" name={unit} />
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

const TrendChart = ({
  title,
  data,
  metrics,
}: {
  title: string;
  data: any[];
  metrics: string[];
}) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          {metrics.map((metric, index) => (
            <Line
              key={index}
              type="monotone"
              dataKey={metric}
              stroke={`#${Math.floor(Math.random() * 16777215).toString(16)}`}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

const ContributorTable = ({ data }: { data: any[] }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Contributor</TableHead>
        <TableHead>Deployment Frequency</TableHead>
        <TableHead>Lead Time</TableHead>
        <TableHead>Time to Restore</TableHead>
        <TableHead>Change Failure Rate</TableHead>
        <TableHead>Code Quality</TableHead>
        <TableHead>Impact</TableHead>
        <TableHead>Collaboration</TableHead>
        <TableHead>Growth</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {data.map((contributor, index) => (
        <TableRow key={index}>
          <TableCell>{contributor.name}</TableCell>
          <TableCell>
            {contributor.deploymentFrequency.toFixed(2)}/week
          </TableCell>
          <TableCell>{contributor.leadTime.toFixed(2)} days</TableCell>
          <TableCell>{contributor.timeToRestore.toFixed(2)} hours</TableCell>
          <TableCell>{contributor.changeFailureRate.toFixed(2)}%</TableCell>
          <TableCell>{contributor.codeQuality.toFixed(2)}/100</TableCell>
          <TableCell>{contributor.impact}</TableCell>
          <TableCell>{contributor.collaboration}</TableCell>
          <TableCell>{contributor.growth}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subWeeks(new Date(), 4),
    to: new Date(),
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const githubData = await fetchGitHubData(dateRange);
        const processedMetrics = processMetrics(githubData, dateRange);
        setMetrics(processedMetrics);

        // Calculate trends
        const trendData = [];
        for (let i = 0; i < 4; i++) {
          const weekStart = startOfWeek(subWeeks(dateRange.to, i));
          const weekEnd = endOfWeek(subWeeks(dateRange.to, i));
          const weekData = await fetchGitHubData({
            from: weekStart,
            to: weekEnd,
          });
          const weekMetrics = processMetrics(weekData, {
            from: weekStart,
            to: weekEnd,
          });
          trendData.unshift({
            date: format(weekStart, "yyyy-MM-dd"),
            ...weekMetrics.reduce((acc, curr) => {
              Object.keys(curr).forEach((key) => {
                if (key !== "name") {
                  acc[`${curr.name}_${key}`] = curr[key];
                }
              });
              return acc;
            }, {}),
          });
        }
        setTrends(trendData);
      } catch (err) {
        setError(
          "Failed to fetch data from GitHub. Please check your token and try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">DORA Metrics Dashboard</h1>
      <p className="mb-4">
        Repository: {REPO_OWNER}/{REPO_NAME}
      </p>
      {/* <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} /> */}
      <Tabs defaultValue="current" className="mt-4">
        <TabsList>
          <TabsTrigger value="current">Current Metrics</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>
        <TabsContent value="current">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricCard
              title="Deployment Frequency"
              data={metrics}
              dataKey="deploymentFrequency"
              unit="per week"
            />
            <MetricCard
              title="Lead Time for Changes"
              data={metrics}
              dataKey="leadTime"
              unit="days"
            />
            <MetricCard
              title="Time to Restore Service"
              data={metrics}
              dataKey="timeToRestore"
              unit="hours"
            />
            <MetricCard
              title="Change Failure Rate"
              data={metrics}
              dataKey="changeFailureRate"
              unit="%"
            />
            <MetricCard
              title="Code Quality Score"
              data={metrics}
              dataKey="codeQuality"
              unit="score"
            />
            <MetricCard
              title="Impact Score"
              data={metrics}
              dataKey="impact"
              unit="issues closed"
            />
            <MetricCard
              title="Collaboration Score"
              data={metrics}
              dataKey="collaboration"
              unit="PR comments"
            />
            <MetricCard
              title="Growth Score"
              data={metrics}
              dataKey="growth"
              unit="files changed"
            />
          </div>
        </TabsContent>
        <TabsContent value="trends">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TrendChart
              title="Deployment Frequency Trend"
              data={trends}
              metrics={metrics.map((m) => `${m.name}_deploymentFrequency`)}
            />
            <TrendChart
              title="Lead Time Trend"
              data={trends}
              metrics={metrics.map((m) => `${m.name}_leadTime`)}
            />
            <TrendChart
              title="Time to Restore Trend"
              data={trends}
              metrics={metrics.map((m) => `${m.name}_timeToRestore`)}
            />
            <TrendChart
              title="Change Failure Rate Trend"
              data={trends}
              metrics={metrics.map((m) => `${m.name}_changeFailureRate`)}
            />
          </div>
        </TabsContent>
      </Tabs>
      <h2 className="text-xl font-semibold mt-8">
        Contributor Metrics Summary
      </h2>
      <ContributorTable data={metrics} />
    </div>
  );
}
