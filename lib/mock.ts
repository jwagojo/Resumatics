import type { Analysis } from "./types";

/**
 * Sample analysis for the static frontend.
 *
 * The evidence quotes below are real substrings of `resumeText`, with one
 * deliberate exception: `r13` cites a Kafka bullet that does not exist. It is
 * there so the evidence verifier has something to catch, and so the downgrade
 * path is visible in the UI rather than theoretical.
 */

const resumeText = `ELENA RUIZ
Backend Engineer · Lisbon, Portugal · elena.ruiz@example.com

EXPERIENCE

Kestrel Data — Backend Engineer
Mar 2022 – present
· Built and maintained 14 Go microservices handling 2.1M daily requests behind an Envoy gateway.
· Cut p99 checkout latency from 840ms to 210ms by replacing N+1 Postgres reads with a batched loader.
· Owned the on-call rotation for the payments domain, writing the runbooks the team still uses.
· Introduced structured logging and OpenTelemetry traces across the payments services, cutting mean time to diagnose from hours to minutes.
· Migrated CI from Jenkins to GitHub Actions, taking the median pipeline from 22 minutes to 6.

Tidewater Systems — Software Engineer
Jul 2019 – Feb 2022
· Wrote the Python ETL that reconciles freight invoices against carrier EDI feeds.
· Added Terraform modules for the team’s AWS VPC and RDS footprint.
· Reduced monthly AWS spend by 31% by right-sizing RDS instances and moving cold invoice archives to S3 Glacier.
· Shipped an internal React dashboard for warehouse throughput.

EDUCATION

BSc Computer Science, Instituto Superior Técnico, 2019

SKILLS

Go, Python, TypeScript, PostgreSQL, Redis, Docker, Terraform, AWS, GitHub Actions, gRPC`;

export const sampleAnalysis: Analysis = {
  job: {
    title: "Senior Platform Engineer",
    company: "Saltmarsh Logistics",
    source: "greenhouse",
    sourceLabel: "boards-api.greenhouse.io",
  },
  resumeFilename: "elena-ruiz-backend.pdf",
  resumeText,

  requirements: [
    {
      id: "r1",
      text: "Five or more years of professional backend engineering",
      category: "experience",
      importance: "required",
      yearsRequired: 5,
    },
    {
      id: "r2",
      text: "Production experience writing Go",
      category: "skill",
      importance: "required",
      yearsRequired: null,
    },
    {
      id: "r3",
      text: "PostgreSQL at scale, including query optimisation",
      category: "skill",
      importance: "required",
      yearsRequired: null,
    },
    {
      id: "r4",
      text: "Kubernetes or equivalent container orchestration in production",
      category: "skill",
      importance: "required",
      yearsRequired: null,
    },
    {
      id: "r5",
      text: "Infrastructure as code with Terraform",
      category: "skill",
      importance: "required",
      yearsRequired: null,
    },
    {
      id: "r6",
      text: "Own service reliability, including on-call participation",
      category: "responsibility",
      importance: "required",
      yearsRequired: null,
    },
    {
      id: "r7",
      text: "Build and maintain CI/CD pipelines",
      category: "responsibility",
      importance: "preferred",
      yearsRequired: null,
    },
    {
      id: "r8",
      text: "Mentor engineers and review technical designs",
      category: "responsibility",
      importance: "required",
      yearsRequired: null,
    },
    {
      id: "r9",
      text: "gRPC or protocol buffers",
      category: "skill",
      importance: "preferred",
      yearsRequired: null,
    },
    {
      id: "r10",
      text: "Operating production workloads on AWS",
      category: "skill",
      importance: "required",
      yearsRequired: null,
    },
    {
      id: "r11",
      text: "Observability tooling across metrics, tracing and logging",
      category: "skill",
      importance: "preferred",
      yearsRequired: null,
    },
    {
      id: "r12",
      text: "Bachelor’s degree in Computer Science or equivalent experience",
      category: "education",
      importance: "required",
      yearsRequired: null,
    },
    {
      id: "r13",
      text: "Event streaming with Kafka, Kinesis or Pulsar",
      category: "skill",
      importance: "preferred",
      yearsRequired: null,
    },
    {
      id: "r14",
      text: "AWS Solutions Architect certification",
      category: "certification",
      importance: "nice_to_have",
      yearsRequired: null,
    },
  ],

  verdicts: [
    {
      requirementId: "r1",
      verdict: "met",
      evidenceQuote: "Jul 2019 – Feb 2022",
      reasoning:
        "Continuous backend roles from July 2019 to the present, which is just over six years.",
    },
    {
      requirementId: "r2",
      verdict: "met",
      evidenceQuote:
        "Built and maintained 14 Go microservices handling 2.1M daily requests behind an Envoy gateway.",
      reasoning:
        "Named language, named scale, named gateway. This is service-level Go work, not incidental scripting.",
    },
    {
      requirementId: "r3",
      verdict: "met",
      evidenceQuote:
        "Cut p99 checkout latency from 840ms to 210ms by replacing N+1 Postgres reads with a batched loader.",
      reasoning:
        "Query optimisation specifically, with a measured before and after rather than a generic claim.",
    },
    {
      requirementId: "r4",
      verdict: "missing",
      evidenceQuote: null,
      reasoning:
        "No mention of Kubernetes, EKS, GKE or any orchestrator. Docker appears in the skills list, but running containers is a different claim from orchestrating them.",
    },
    {
      requirementId: "r5",
      verdict: "met",
      evidenceQuote:
        "Added Terraform modules for the team’s AWS VPC and RDS footprint.",
      reasoning:
        "Terraform by name, applied to networking and database infrastructure.",
    },
    {
      requirementId: "r6",
      verdict: "met",
      evidenceQuote:
        "Owned the on-call rotation for the payments domain, writing the runbooks the team still uses.",
      reasoning:
        "Ownership of a rotation for a named domain, which is stronger than merely participating in one.",
    },
    {
      requirementId: "r7",
      verdict: "met",
      evidenceQuote:
        "Migrated CI from Jenkins to GitHub Actions, taking the median pipeline from 22 minutes to 6.",
      reasoning:
        "A pipeline migration owned end to end, with the improvement quantified.",
    },
    {
      requirementId: "r8",
      verdict: "partial",
      evidenceQuote: "writing the runbooks the team still uses",
      reasoning:
        "Authoring documentation the team adopted is evidence of influence, but nothing states that Elena mentored engineers or reviewed designs. Half credit.",
    },
    {
      requirementId: "r9",
      verdict: "partial",
      evidenceQuote:
        "Go, Python, TypeScript, PostgreSQL, Redis, Docker, Terraform, AWS, GitHub Actions, gRPC",
      reasoning:
        "gRPC appears in the skills list only. No bullet shows it in use, so this earns half credit rather than full.",
    },
    {
      requirementId: "r10",
      verdict: "met",
      evidenceQuote:
        "Reduced monthly AWS spend by 31% by right-sizing RDS instances and moving cold invoice archives to S3 Glacier.",
      reasoning:
        "Names three AWS services and a cost outcome, which implies operational ownership rather than familiarity.",
    },
    {
      requirementId: "r11",
      verdict: "met",
      evidenceQuote:
        "Introduced structured logging and OpenTelemetry traces across the payments services, cutting mean time to diagnose from hours to minutes.",
      reasoning:
        "Covers two of the three observability pillars by name, with the operational effect stated.",
    },
    {
      requirementId: "r12",
      verdict: "met",
      evidenceQuote: "BSc Computer Science, Instituto Superior Técnico, 2019",
      reasoning: "Degree, field and institution all stated.",
    },
    {
      requirementId: "r13",
      verdict: "partial",
      // Deliberately fabricated. The verifier will not find this in the resume
      // and will downgrade the verdict to `missing`.
      evidenceQuote:
        "Built event-driven pipelines using Kafka for freight telemetry.",
      reasoning:
        "Cited a Kafka bullet from the freight work as partial evidence of event streaming.",
    },
    {
      requirementId: "r14",
      verdict: "missing",
      evidenceQuote: null,
      reasoning: "No certifications section and no certification named anywhere.",
    },
  ],

  standouts: [
    {
      kind: "project",
      title: "A payments service on a local Kubernetes cluster",
      why: "The posting wants production orchestration. Shipping one existing Go service with hand-written manifests is more distinctive than listing Docker.",
      how: "Take one Kestrel payments service, write a Deployment, Service, and probes, run it on kind, and put the manifests plus a short runbook in a public repo.",
      requirementId: "r4",
    },
    {
      kind: "skill",
      title: "Query plans for the batched Postgres loader",
      why: "Several other applicants will list Postgres. A before/after EXPLAIN of the N+1 fix is rarer and already sits in the work history.",
      how: "Capture EXPLAIN ANALYZE for the old N+1 path and the batched loader, and add those two numbers to the checkout-latency bullet.",
      requirementId: "r3",
    },
  ],

  recommendations: [
    {
      kind: "rewrite",
      requirementId: "r8",
      before:
        "Owned the on-call rotation for the payments domain, writing the runbooks the team still uses.",
      after:
        "Owned reliability for the payments domain: ran the on-call rotation and authored the runbooks now used team-wide.",
      why: "Same facts, reordered. It leads with reliability ownership, which is the phrase the posting itself uses, and “used team-wide” surfaces the influence that was already implicit in “the team still uses”.",
    },
    {
      kind: "rewrite",
      requirementId: "r10",
      before:
        "Reduced monthly AWS spend by 31% by right-sizing RDS instances and moving cold invoice archives to S3 Glacier.",
      after:
        "Cut monthly AWS spend 31% by right-sizing RDS instances and tiering cold invoice archives to S3 Glacier.",
      why: "The original buries the number mid-sentence. Leading with the verb and the figure gets the result read before the method.",
    },
    {
      kind: "ask",
      requirementId: "r9",
      question:
        "Your skills list includes gRPC but no bullet shows you using it. Which of the 14 services spoke gRPC, and what did you build with it? One concrete line would move this from half credit to full.",
    },
    {
      kind: "ask",
      requirementId: "r8",
      question:
        "Did you review designs or onboard anyone onto the payments rotation? If so, that is a required item currently sitting at half credit — but only add it if it actually happened.",
    },
    {
      kind: "deprioritize",
      target: "Shipped an internal React dashboard for warehouse throughput.",
      why: "This posting has no frontend requirement, so the line earns nothing here. It is occupying space that could describe the Envoy gateway work in more depth.",
    },
    {
      kind: "real_gap",
      requirementId: "r4",
      why: "Kubernetes is listed as required and nothing in the resume shows orchestration experience. No rewording closes this one — Docker in a skills list is a different claim, and stretching it would not survive a technical interview.",
      howToClose:
        "This is the single gap worth closing before applying. Deploy one of your Go services to a local kind cluster and write the manifests by hand rather than generating them; that gives you something specific to talk about instead of a keyword.",
    },
    {
      kind: "real_gap",
      requirementId: "r13",
      why: "No event streaming experience appears anywhere in the file. Worth knowing: the first pass of this analysis cited a Kafka bullet that does not exist in your resume, and that evidence was discarded rather than counted.",
      howToClose:
        "Preferred rather than required, so it is not blocking. If you have adjacent queue experience, name it honestly in a cover letter rather than implying Kafka.",
    },
    {
      kind: "real_gap",
      requirementId: "r14",
      why: "Not held. It is the lowest-weighted item on the posting — 1 point out of 36 — so it moves the score barely at all.",
      howToClose:
        "Skip it unless you are between roles. The Terraform and cost-optimisation work already demonstrate the underlying knowledge the certificate would attest to.",
    },
  ],
  omitted: [
    {
      text: "Excellent verbal communication skills",
      reason: "Verbal skill is an interview signal.",
    },
  ],
};
