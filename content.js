// Content for the terminal: links, the resume "filesystem", and small
// helpers used to render that content (link tag, email obfuscation, diagrams).
// Command logic and FS navigation live in commands.js.

const LINKS = {
    linkedin: 'https://www.linkedin.com/in/iliasvougioukas',
    scholar:  'https://scholar.google.com/citations?user=3_mQ5AUAAAAJ&hl=en',
    github:   'https://github.com/spidermeup',
};

const PAPERS = {
    everyWalk: 'https://dl.acm.org/doi/10.1145/3503222.3507718',
    ede:       'https://dl.acm.org/doi/10.1109/ISCA52012.2021.00043',
    brb:       'https://ieeexplore.ieee.org/document/8675222',
    nucleus:   'https://dl.acm.org/doi/10.1145/3126544',
    sdm:       'https://arxiv.org/abs/2110.09166',
};

function link(href, label) {
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

// Email assembled at runtime so it isn't a literal string in the source.
function getEmail() {
    const user = ['il', 'ias'].join('');
    const domain = ['vougioukas', 'org'].join('.');
    return user + String.fromCharCode(64) + domain;
}

function sdmDiagram() {
    // The ring is drawn to sub-row precision: a glyph that sits high, mid
    // or low in its cell ( ' · . ) says where the true curve falls inside
    // that row, which is worth about 3x the vertical resolution. Rounding
    // to whole rows instead flattens the top and bottom into a straight
    // run of dots. Width is 1.95x the height because a monospace cell is
    // about twice as tall as it is wide.
    // Double-quoted: the rows contain apostrophes.
    return [
        "                ,      ,        ,",
        "          ,                           ,",
        "                     .··'''''''··.          ,",
        "                   .'             '.",
        "                  ·      o    o     ·",
        "          ,      ·                   ·",
        "                ·      o          o   ·",
        "                ·          X          ·       ,",
        "       ,        ·   o          o      ·",
        "                 ·       o           ·",
        "                  ·           o     ·",
        "                   '.             .'",
        "          ,          '··.......··'          ,",
        "                ,",
        "                         ,        ,"
    ].join('\n');
}

// Virtual filesystem. Files have either a string `content` or a function
// that returns one (used when content needs runtime assembly, e.g. the email).
const fs = {
    contact: {
        type: 'file',
        html: true,
        content: () => {
            const e = getEmail();
            return `email:     ${link('mailto:' + e, e)}\n` +
                   `linkedin:  ${link(LINKS.linkedin, 'linkedin.com/in/iliasvougioukas')}\n` +
                   `scholar:   ${link(LINKS.scholar, 'scholar.google.com/citations')}\n` +
                   `github:    ${link(LINKS.github, 'github.com/spidermeup')}`;
        }
    },
    interests: {
        type: 'file',
        content: 'Open sea sailing, soccer, hiking, cooking, playing music, and tinkering with electronics.'
    },
    resume: {
        type: 'dir',
        children: {
            experience: {
                type: 'file',
                content: [
                    'NVIDIA, Accelerated Compute Engineer',
                    '2024 to present',
                    '',
                    "I'm the tech lead on next-generation CPU design for HPC. Most of my work is on workloads that matter in HPC: chemical-bond simulations, CFD, weather forecasting, and large language models. Some run on CPU only and others use a mix of CPU and accelerators. I find where the hardware slows them down, and that feedback shapes the next generation of cores.",
                    '',
                    '',
                    'Arm Ltd, Staff Research Engineer',
                    '2019 to 2024',
                    '',
                    'I designed future architecture and microarchitecture for Arm cores. A few of the things I worked on:',
                    '',
                    'Memory translation. I introduced a change that makes page walks cheaper. On workloads that hammer the TLB, performance went up by around 15%.',
                    '',
                    'Hyperdimensional branch prediction. I designed a predictor that uses hyperdimensional computing, which is essentially a machine learning trick for representing data, and applied it to predicting control flow. It is patented.',
                    '',
                    'Loop-level parallelism. I led the performance evaluation team for a hardware/software codesign technique that finds parallelism the hardware would otherwise miss in loops.',
                    '',
                    'Non-volatile memory. I evaluated emerging NVM technologies for the SAGE2 EU project and helped Arm decide how to use them.',
                    '',
                    '',
                    'Arm Ltd, Sponsored PhD Student',
                    '2015 to 2019',
                    '',
                    'My PhD was sponsored by Arm. Two pieces of work came out of those years.',
                    '',
                    'Heterogeneous compute. Designs that let cores of different sizes hand work off to each other faster and with less overhead.',
                    '',
                    'Speculative execution. A hybrid branch predictor that combines a traditional design with a neural network. It improves accuracy and adds some resistance to side-channel attacks.',
                    '',
                    '',
                    'SeeByte, Embedded Robotics Intern',
                    '2014 to 2015',
                    '',
                    'I wrote a video mosaicer for an underwater robot. It used a Kalman filter to fuse dead-reckoning with feature matching. I also built a simulator with ROS and UWsim so we could verify it when the actual robot was not available.'
                ].join('\n')
            },
            education: {
                type: 'file',
                content: [
                    'PhD in Computer Science',
                    'University of Southampton, 2015 to 2019',
                    '',
                    'For my thesis I worked on context switching and migrations for heterogeneous multiprocessors. In short, microarchitectural tricks that make moving work between different core types cheaper, plus hardware that makes speculation harder to exploit through side channels.',
                    '',
                    '',
                    'MSc in Embedded Software Systems',
                    'Aalborg University, 2013 to 2015',
                    '',
                    'My MSc thesis was on fault tolerance at the hardware design level. I built a verification method that catches faults during design using formal semantics.',
                    '',
                    '',
                    'Diploma in Electrical and Electronic Engineering and Computer Science',
                    'University of Patras, 2006 to 2013',
                    '',
                    'For my undergraduate thesis I designed a modern microprocessor system. It was built around an Arm Cortex-M3 with the usual peripherals (LCD, ADC, and so on) and an FPGA acting as a small graphics processor.',
                    '',
                    '',
                    'Honors: an industrial CASE studentship that funded the PhD, and an ACG and Greek Ministry of Education Excellence Award.'
                ].join('\n')
            },
            publications: {
                type: 'file',
                html: true,
                content: () => [
                    `A few papers and the key idea behind each. Full list with citations on ${link(LINKS.scholar, 'Scholar')}:`,
                    '',
                    '',
                    link(PAPERS.everyWalk, 'Every Walk\'s a Hit: Making Page Walks Single-Access Cache Hits'),
                    'ASPLOS 2022',
                    '',
                    '       ┌────┐    ┌────┐    ┌────┐    ┌────┐',
                    '       │ L1 │ ─→ │ L2 │ ─→ │ L3 │ ─→ │ L4 │       (4 cache accesses)',
                    '       └────┘    └────┘    └────┘    └────┘',
                    '',
                    '       ┌────┐    ┌──────────┐    ┌────┐',
                    '       │ L1 │ ─→ │  L2 + L3 │ ─→ │ L4 │           (3 cache accesses)',
                    '       └────┘    └──────────┘    └────┘',
                    '',
                    "A page walk normally costs one cache access per level of the page table. This paper merges adjacent levels: an upper-level table and all the lower-level tables it points to are stored together in one larger block, indexed by the bits of both. The merged table holds the same content as the two it replaces, but a single cache access does the work of two. Applied where it can across the hierarchy, the walk gets shorter and TLB-heavy workloads see around 15% more performance.",
                    '',
                    '',
                    '',
                    link(PAPERS.sdm, 'Branch Predicting with Sparse Distributed Memories'),
                    'arXiv:2110.09166, 2021',
                    '',
                    sdmDiagram(),
                    '',
                    '       X query    o activated    , inactive    ring = activation radius',
                    '',
                    'Reframes branch prediction as recall from a sparse distributed memory. Each branch context maps to a point in a high-dimensional space, and a prediction is the aggregate of every stored outcome within a fixed radius of the query. Similar contexts naturally overlap their activation neighborhoods, so generalization comes from geometry instead of hand-tuned hash tables.',
                    '',
                    '',
                    '',
                    link(PAPERS.ede, 'Execution Dependence Extension (EDE): ISA Support for Eliminating Fences'),
                    'ISCA 2021',
                    '',
                    '       fence   ld A   st B  ║  ld C   st D       (a fence orders every',
                    '                            ║                     pair that crosses it)',
                    '',
                    '       EDE     ld A   st B     ld C   st D       (EDE orders just the one',
                    '                         └────────┘               pair; the rest flows on)',
                    '',
                    'Memory fences are blunt instruments: they block reordering across them for every operation in flight. EDE adds ISA-level primitives that express ordering only between the specific operations that need it, so the pipeline keeps moving past everything else.',
                    '',
                    '',
                    '',
                    link(PAPERS.brb, 'BRB: Mitigating Branch Predictor Side-Channels'),
                    'HPCA 2019',
                    '',
                    '       ┌──────────────────┐',
                    '       │                  │  ── save ───→   ┌───────┐',
                    '       │ branch predictor │                 │  BRB  │',
                    '       │                  │  ←─── restore   └───────┘',
                    '       └──────────────────┘',
                    '',
                    "Branch predictor state is what keeps prediction accurate, but it also leaks across security boundaries (Spectre and friends). The defensive fix is to flush the predictor on every context switch, which works but means every process restarts cold and pays for it. BRB is a small per-process buffer that snapshots a minimal slice of predictor state on switch-out and restores it on switch-in. Each process keeps its own warm state, isolation holds, the cold-start tax goes away.",
                    '',
                    '',
                    '',
                    link(PAPERS.nucleus, 'Nucleus: Finding the Sharing Limit of Heterogeneous Cores'),
                    'ACM TECS 16, 2017  (best-paper nominee)',
                    '',
                    '       ┌──────────────┐',
                    '       │              │     shared state     ┌────────┐',
                    '       │     BIG      ╞══════════════════════╡ LITTLE │',
                    '       │              │                      └────────┘',
                    '       └──────────────┘',
                    '',
                    'In a big.LITTLE-style design, how much state can the big and little cores share before the whole thing stops making sense as a design? Nucleus quantifies that limit, which directly determines how cheaply you can migrate work between cores.',
                    '',
                    ''
                ].join('\n')
            },
            patents: {
                type: 'file',
                content: [
                    'Five patents total: two granted, three pending.',
                    '',
                    'Granted: two on branch prediction designs that improve performance and security.',
                    '',
                    'Pending: two on memory translation optimizations, and one on speculation using hyperdimensional computing.'
                ].join('\n')
            },
            skills: {
                type: 'file',
                content: [
                    'Areas: core and system architecture, microarchitecture, performance modeling and simulation (mostly gem5), workload optimization, machine learning, memory translation, speculative execution, and hardware security.',
                    '',
                    'Programming languages: C++, C, Python, Perl, and assembly (both Arm and x86).',
                    '',
                    'Spoken languages: Greek (native), English (fluent), French (DELF B2), German (A1).'
                ].join('\n')
            }
        }
    }
};
