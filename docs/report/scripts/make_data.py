#!/usr/bin/env python3
"""
make_data.py -- builds every table and every plot-data file of the report from the raw CSV files
produced by the web application (one CSV per contest, 10,000 games each).

Usage (from the report folder):    python3 scripts/make_data.py
Needs: python3, pandas, numpy, scipy.

Reads : raw/*.csv
Writes: data/*.csv        (small files read by pgfplots)
        tables/*.tex      (tabular bodies included by main.tex)
        data/results.json (every number of the report, for checking)
"""
import json, os
import numpy as np, pandas as pd
from math import comb, sqrt
from scipy import stats

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW, DATA, TABLES = (os.path.join(ROOT, d) for d in ("raw", "data", "tables"))
os.makedirs(DATA, exist_ok=True)
os.makedirs(TABLES, exist_ok=True)

K_CELLS, N_CELLS = 17, 100                        # ship cells / board cells
NAME = {"dumb": "SRA", "gba": "GBA", "abaop": "ABAOP"}
# key, file, label, layout
CONTESTS = [
    ("sra_sra_same", "SRA-SRA_samegrid_.csv",       "SRA vs SRA",     "same"),
    ("sra_sra_diff", "SRA-SRA_different_grid_.csv", "SRA vs SRA",     "different"),
    ("gba_gba",      "GBA-GBA.csv",                 "GBA vs GBA",     "same"),
    ("abaop_abaop",  "ABAOP-ABAOP.csv",             "ABAOP vs ABAOP", "same"),
    ("sra_gba",      "SRA-GBA.csv",                 "SRA vs GBA",     "same"),
    ("sra_abaop",    "SRA-ABAOP.csv",               "SRA vs ABAOP",   "same"),
    ("gba_abaop",    "GBA-ABAOP.csv",               "GBA vs ABAOP",   "same"),
]


# ----------------------------------------------------------------------------- helpers
def wilson(k, n, z=1.96):
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return c - h, c + h


def desc(x):
    x = np.asarray(x, float)
    n = len(x)
    sd = x.std(ddof=1)
    return dict(n=n, mean=x.mean(), sd=sd, se=sd / sqrt(n), ci=1.96 * sd / sqrt(n), median=float(np.median(x)),
                min=x.min(), max=x.max(), q1=np.percentile(x, 25), q3=np.percentile(x, 75),
                p5=np.percentile(x, 5), p95=np.percentile(x, 95))


def fmt_p(p):
    if p < 1e-4:
        return r"$<10^{-4}$"
    return f"{p:.3f}"


def f(v, k=2):
    return f"{v:.{k}f}"


def pct(v, k=1):
    return f"{100 * v:.{k}f}\\%"


def thousands(v):
    return f"{v:,}".replace(",", "\\,")


def rowcolor(cols, color="blue!20"):
    return "\\rowcolor{%s}\n" % color + " & ".join(cols) + " \\\\ \\hline\n"


def write_table(name, colspec, header, rows, color="blue!20"):
    s = "\\begin{tabular}{%s}\n\\hline\n" % colspec
    s += rowcolor(header, color)
    for r in rows:
        s += " & ".join(r) + " \\\\ \\hline\n"
    s += "\\end{tabular}\n"
    open(os.path.join(TABLES, name), "w").write(s)


tag = lambda label, layout: label + (" (diff.)" if layout == "different" else "")

# ----------------------------------------------------------------------------- load
D = {}
for key, fn, label, layout in CONTESTS:
    d = pd.read_csv(os.path.join(RAW, fn))
    d["A"] = d["A"].map(NAME)
    d["B"] = d["B"].map(NAME)
    D[key] = d
R = {"contests": {}, "agents": {}}

# ----------------------------------------------------------------------------- integrity
integ = []
for key, fn, label, layout in CONTESTS:
    d = D[key]
    a_wins = np.where(d.full_A < d.full_B, True, np.where(d.full_A > d.full_B, False, d["first"] == "A"))
    rule = float(((d.winner == "A") == a_wins).mean())
    last = float(np.mean([int(str(a).split("|")[-1]) == fa and int(str(b).split("|")[-1]) == fb
                          for a, b, fa, fb in zip(d.sunk_at_A, d.sunk_at_B, d.full_A, d.full_B)]))
    rng = float(((d.full_A.between(K_CELLS, N_CELLS)) & (d.full_B.between(K_CELLS, N_CELLS))).mean())
    integ.append(dict(key=key, n=len(d), rule=rule, last=last, rng=rng, nulls=int(d.isnull().sum().sum()),
                      first_A=float((d["first"] == "A").mean())))
R["integrity"] = integ

# ----------------------------------------------------------------------------- per contest
for key, fn, label, layout in CONTESTS:
    d = D[key]
    n = len(d)
    fa, fb = d.full_A.values, d.full_B.values
    diff = fa - fb
    wa = int((d.winner == "A").sum())
    lo, hi = wilson(wa, n)
    t, p = stats.ttest_rel(fa, fb)
    tie = float((fa == fb).mean())
    fm_k = int((d.winner == d["first"]).sum())
    fm_lo, fm_hi = wilson(fm_k, n)
    rho = float(np.corrcoef(fa, fb)[0, 1])
    z = np.arctanh(rho)
    zse = 1 / sqrt(n - 3)
    rho_ci = (float(np.tanh(z - 1.96 * zse)), float(np.tanh(z + 1.96 * zse)))
    sdA, sdB, sdd = fa.std(ddof=1), fb.std(ddof=1), diff.std(ddof=1)
    R["contests"][key] = dict(
        label=label, layout=layout, A=d.A.iloc[0], B=d.B.iloc[0], n=n,
        A_desc=desc(fa), B_desc=desc(fb), winsA=wa, winsB=n - wa, winA=wa / n, winA_ci=(lo, hi),
        binom_p=float(stats.binomtest(wa, n, 0.5).pvalue),
        first_wins=fm_k / n, first_wins_ci=(fm_lo, fm_hi), tie=tie, first_pred=(1 + tie) / 2,
        d_mean=float(diff.mean()), d_sd=float(sdd), d_ci=float(1.96 * sdd / sqrt(n)), t=float(t), p=float(p),
        dz=float(diff.mean() / sdd), pA_less=float((fa < fb).mean()), pA_more=float((fa > fb).mean()),
        rho=rho, rho_ci=rho_ci, var_indep=float(sdA ** 2 + sdB ** 2), var_paired=float(sdd ** 2),
        var_ratio=float((sdA ** 2 + sdB ** 2) / sdd ** 2),
        hit_end_A=float((d.hits_A / d.moves_A).mean()), hit_end_B=float((d.hits_B / d.moves_B).mean()),
        sunk_end_A=float(d.sunk_A.mean()), sunk_end_B=float(d.sunk_B.mean()),
        first_moves_wins_A_when_first=float(((d.winner == "A") & (d["first"] == "A")).sum() / (d["first"] == "A").sum()),
    )


# ----------------------------------------------------------------------------- per agent (pooled over every game the agent played)
def agent_frame(agent):
    parts = []
    for key, fn, label, layout in CONTESTS:
        d = D[key]
        for s in ("A", "B"):
            if d[s].iloc[0] == agent:
                parts.append(pd.DataFrame({
                    "contest": key, "full": d["full_" + s], "moves_end": d["moves_" + s], "hits_end": d["hits_" + s],
                    "first_hit": d["first_hit_" + s], "cpu": d["cpu_ms_" + s], "sunk_at": d["sunk_at_" + s]}))
    return pd.concat(parts, ignore_index=True)


AG = {a: agent_frame(a) for a in ("SRA", "GBA", "ABAOP")}
for a, df in AG.items():
    tl = np.array([[int(v) for v in s.split("|")] for s in df.sunk_at])
    df["hit_full"] = K_CELLS / df["full"]
    df["hit_end"] = df.hits_end / df.moves_end
    R["agents"][a] = dict(
        n=len(df), shots=desc(df.full), hit_full=float(df.hit_full.mean()), hit_end=float(df.hit_end.mean()),
        first_hit=desc(df.first_hit), timeline_mean=[float(v) for v in tl.mean(axis=0)],
        timeline_sd=[float(v) for v in tl.std(axis=0, ddof=1)],
        cpu=desc(df.cpu), cpu_per_shot=float(df.cpu.sum() / df.full.sum()),
        p_all100=float((df.full == 100).mean()),
        by_contest={k: float(g.full.mean()) for k, g in df.groupby("contest")})

# ----------------------------------------------------------------------------- SRA closed form
E_th = K_CELLS * (N_CELLS + 1) / (K_CELLS + 1)
V_th = K_CELLS * (N_CELLS - K_CELLS) * (N_CELLS + 1) / ((K_CELLS + 1) ** 2 * (K_CELLS + 2))
pmf_th = {m: comb(m - 1, K_CELLS - 1) / comb(N_CELLS, K_CELLS) for m in range(K_CELLS, N_CELLS + 1)}
cdf_th = np.cumsum([pmf_th[m] for m in range(K_CELLS, N_CELLS + 1)])
sra_full = AG["SRA"].full.values
cnt = np.array([(sra_full == m).sum() for m in range(K_CELLS, N_CELLS + 1)], float)
exp_cnt = np.array([pmf_th[m] for m in range(K_CELLS, N_CELLS + 1)]) * len(sra_full)
obs_b, exp_b, o, e = [], [], 0.0, 0.0        # chi-square with pooled cells so that every expected count >= 5
for c_, e_ in zip(cnt, exp_cnt):
    o += c_
    e += e_
    if e >= 5:
        obs_b.append(o)
        exp_b.append(e)
        o = e = 0.0
if e > 0:
    obs_b[-1] += o
    exp_b[-1] += e
chi2 = float(((np.array(obs_b) - np.array(exp_b)) ** 2 / np.array(exp_b)).sum())
dof = len(obs_b) - 1
ecdf = np.cumsum(cnt) / cnt.sum()
R["sra_theory"] = dict(mean=E_th, sd=sqrt(V_th), first_hit=(N_CELLS + 1) / (K_CELLS + 1), p100=K_CELLS / N_CELLS,
                       median=int(np.searchsorted(cdf_th, 0.5)) + K_CELLS,
                       chi2=chi2, dof=dof, chi2_p=float(1 - stats.chi2.cdf(chi2, dof)), ks_D=float(np.abs(ecdf - cdf_th).max()),
                       emp_mean=float(sra_full.mean()), emp_sd=float(sra_full.std(ddof=1)),
                       emp_median=float(np.median(sra_full)), emp_p100=float((sra_full == 100).mean()),
                       emp_first_hit=float(AG["SRA"].first_hit.mean()), n=len(sra_full))

# ----------------------------------------------------------------------------- comparisons among agents (pooled distributions)
R["agent_tests"] = {}
for x, y in (("SRA", "GBA"), ("GBA", "ABAOP"), ("SRA", "ABAOP")):
    a, b = AG[x].full.values, AG[y].full.values
    t, p = stats.ttest_ind(a, b, equal_var=False)
    R["agent_tests"][f"{x}_{y}"] = dict(diff=float(a.mean() - b.mean()), t=float(t), p=float(p),
                                        pct_reduction=float(100 * (a.mean() - b.mean()) / a.mean()))
R["homogeneity"] = {}                              # does the mean of an agent depend on the opponent / layout? (ANOVA)
for a, df in AG.items():
    groups = [g.full.values for _, g in df.groupby("contest")]
    F, p = stats.f_oneway(*groups)
    R["homogeneity"][a] = dict(F=float(F), p=float(p), k=len(groups))

# ----------------------------------------------------------------------------- CPU regression through the origin (ms per shot)
for a, df in AG.items():
    x, y = df.full.values.astype(float), df.cpu.values.astype(float)
    R["agents"][a]["cpu_beta_origin"] = float((x * y).sum() / (x * x).sum())
    R["agents"][a]["cpu_corr"] = float(np.corrcoef(x, y)[0, 1])

# ----------------------------------------------------------------------------- plot data
grid = np.unique(np.round(np.logspace(0, 4, 260)).astype(int))
grid = grid[grid <= 10000]
for key, fn, label, layout in CONTESTS:
    d = D[key]
    fa, fb = d.full_A.values.astype(float), d.full_B.values.astype(float)
    dd = fa - fb
    winA = (d.winner == "A").values.astype(float)
    n_ = np.arange(1, len(d) + 1)
    mA, mB = np.cumsum(fa) / n_, np.cumsum(fb) / n_
    md = np.cumsum(dd) / n_
    sd_d = np.sqrt(np.maximum((np.cumsum(dd ** 2) - n_ * md ** 2) / np.maximum(n_ - 1, 1), 0))
    ci = 1.96 * sd_d / np.sqrt(n_)
    wr = np.cumsum(winA) / n_
    band = 1.96 * np.sqrt(0.25 / n_)
    out = pd.DataFrame({"n": grid, "meanA": mA[grid - 1], "meanB": mB[grid - 1], "diff": md[grid - 1],
                        "diff_lo": (md - ci)[grid - 1], "diff_hi": (md + ci)[grid - 1],
                        "winA": wr[grid - 1], "band_lo": 0.5 - band[grid - 1], "band_hi": 0.5 + band[grid - 1]})
    out.to_csv(os.path.join(DATA, f"running_{key}.csv"), index=False, float_format="%.5f")

g = D["gba_abaop"].head(100)                       # raw shots of the first 100 games (GBA vs ABAOP)
pd.DataFrame({"game": g.game, "GBA": g.full_A, "ABAOP": g.full_B}).to_csv(os.path.join(DATA, "raw_first100_gba_abaop.csv"), index=False)

bins = np.arange(15, 101)                          # distribution of the shots per agent + SRA closed form
dist = {"shots": bins}
for a, df in AG.items():
    c = np.array([(df.full == m).sum() for m in bins], float)
    dist[a] = c / c.sum()
dist["SRA_theory"] = [pmf_th.get(int(m), 0.0) for m in bins]
pd.DataFrame(dist).to_csv(os.path.join(DATA, "dist_agents.csv"), index=False, float_format="%.6f")

tl = pd.DataFrame({"k": [1, 2, 3, 4, 5]})          # when does each ship sink?
for a in AG:
    tl[a] = R["agents"][a]["timeline_mean"]
tl.to_csv(os.path.join(DATA, "timeline.csv"), index=False, float_format="%.4f")

xs = np.arange(-30, 31)                            # histogram of d = shotsA - shotsB
h = {"d": xs}
for key, nm in (("sra_sra_same", "same"), ("sra_sra_diff", "different"), ("abaop_abaop", "abaop")):
    dd = (D[key].full_A - D[key].full_B).values
    h[nm] = np.array([(dd == v).sum() for v in xs], float) / len(dd)
pd.DataFrame(h).to_csv(os.path.join(DATA, "hist_diff.csv"), index=False, float_format="%.6f")

pd.DataFrame({"agent": list(AG), "ms_per_shot": [R["agents"][a]["cpu_per_shot"] for a in AG],
              "ms_per_game": [R["agents"][a]["cpu"]["mean"] for a in AG]}).to_csv(os.path.join(DATA, "cpu.csv"), index=False, float_format="%.5f")

# ----------------------------------------------------------------------------- TABLES
rows = []                                          # shots per agent (pooled)
for a in AG:
    s = R["agents"][a]["shots"]
    rows.append([a, thousands(s["n"]), f(s["mean"]), f(s["sd"]), f"$\\pm$ {f(s['ci'], 2)}", f(s["median"], 0),
                 f"{s['p5']:.0f}--{s['p95']:.0f}", f"{s['min']:.0f}", f"{s['max']:.0f}"])
write_table("tab_agents_shots.tex", "|c|c|c|c|c|c|c|c|c|",
            ["Agent", "Agent-games", "Mean", "SD", "95\\% CI of mean", "Median", "P5--P95", "Min", "Max"], rows)

s = "\\begin{tabular}{|l|l|c|c|c|c|c|}\n\\hline\n" + rowcolor(["Contest", "Agent", "Mean", "SD", "Median", "Min", "Max"])
for key, fn, label, layout in CONTESTS:            # shots per contest and side
    c = R["contests"][key]
    for i, side in enumerate(("A", "B")):
        dsc = c[side + "_desc"]
        first = "\\multirow{2}{*}{%s}" % tag(label, layout) if i == 0 else ""
        line = [first, f"{c[side]} ({'left' if side == 'A' else 'right'})", f(dsc["mean"]), f(dsc["sd"]), f(dsc["median"], 0),
                f"{dsc['min']:.0f}", f"{dsc['max']:.0f}"]
        s += " & ".join(line) + (" \\\\ \\cline{2-7}\n" if i == 0 else " \\\\ \\hline\n")
s += "\\end{tabular}\n"
open(os.path.join(TABLES, "tab_contests_shots.tex"), "w").write(s)

rows = []                                          # wins
for key, fn, label, layout in CONTESTS:
    c = R["contests"][key]
    rows.append([tag(label, layout), thousands(c["winsA"]), thousands(c["winsB"]), pct(c["winA"], 2),
                 f"{100 * c['winA_ci'][0]:.2f}--{100 * c['winA_ci'][1]:.2f}\\%",
                 fmt_p(c["binom_p"]) if c["A"] == c["B"] else "--"])
write_table("tab_wins.tex", "|l|c|c|c|c|c|",
            ["Contest", "Wins left (A)", "Wins right (B)", "Win rate of A", "95\\% CI (Wilson)", "$p$ ($H_0\\!: 50\\%$)"], rows)

rows = []                                          # first-mover advantage
for key, fn, label, layout in CONTESTS:
    c = R["contests"][key]
    rows.append([tag(label, layout), pct(c["tie"], 2), pct(c["first_pred"], 2), pct(c["first_wins"], 2),
                 f"{100 * c['first_wins_ci'][0]:.2f}--{100 * c['first_wins_ci'][1]:.2f}\\%"])
write_table("tab_firstmover.tex", "|l|c|c|c|c|",
            ["Contest", "$P(\\text{tie})$", "Predicted $\\frac{1+P(\\text{tie})}{2}$", "Observed first-shooter wins", "95\\% CI (Wilson)"],
            rows, "sunglow")

rows = []                                          # paired difference
for key, fn, label, layout in CONTESTS:
    c = R["contests"][key]
    rows.append([tag(label, layout), f(c["d_mean"]), f"$\\pm$ {f(c['d_ci'])}", f(c["d_sd"]),
                 f(c["t"], 1), fmt_p(c["p"]), f(c["dz"]), pct(c["pA_less"]), pct(c["tie"]), pct(c["pA_more"])])
write_table("tab_paired.tex", "|l|c|c|c|c|c|c|c|c|c|",
            ["Contest", "Mean $\\bar d$", "95\\% CI", "SD of $d$", "$t$", "$p$", "$d_z$", "$P(d\\!<\\!0)$", "$P(d\\!=\\!0)$", "$P(d\\!>\\!0)$"],
            rows)

rows = []                                          # secondary metrics
for a in AG:
    r_ = R["agents"][a]
    rows.append([a, pct(r_["hit_full"], 2), pct(r_["hit_end"], 2), f(r_["first_hit"]["mean"]), f(r_["first_hit"]["median"], 0)] +
                [f(v, 1) for v in r_["timeline_mean"]])
write_table("tab_secondary.tex", "|c|c|c|c|c|c|c|c|c|c|",
            ["Agent", "Hit rate (whole game)", "Hit rate (at game end)", "1st hit (mean)", "1st hit (median)",
             "Ship 1", "Ship 2", "Ship 3", "Ship 4", "Ship 5"], rows)

rows = []                                          # cpu
base = R["agents"]["SRA"]["cpu_per_shot"]
for a in AG:
    r_ = R["agents"][a]
    c = r_["cpu"]
    rows.append([a, f(c["mean"], 3), f(c["median"], 0), f(c["sd"], 2), f"{c['p95']:.0f}", f"{c['max']:.0f}",
                 f(r_["cpu_per_shot"] * 1000, 1), f(r_["cpu_per_shot"] / base, 1) + "$\\times$"])
write_table("tab_cpu.tex", "|c|c|c|c|c|c|c|c|",
            ["Agent", "Mean ms/game", "Median", "SD", "P95", "Max", "$\\mu$s per shot", "Relative to SRA"], rows)

rows = []                                          # layout / variance
for key, fn, label, layout in CONTESTS:
    c = R["contests"][key]
    rows.append([tag(label, layout), layout, f(c["rho"], 3), f"[{c['rho_ci'][0]:.3f}, {c['rho_ci'][1]:.3f}]",
                 f(np.sqrt(c["var_indep"]), 2), f(np.sqrt(c["var_paired"]), 2), f(c["var_ratio"], 2)])
write_table("tab_layout.tex", "|l|c|c|c|c|c|c|",
            ["Contest", "Layout", "$\\hat\\rho$", "95\\% CI of $\\rho$", "SD if independent", "Observed SD of $d$", "Variance ratio"],
            rows, "aliceblue")

t_ = R["sra_theory"]                               # SRA closed form
rows = [["Mean shots to finish", f(t_["mean"], 2), f(t_["emp_mean"], 2)],
        ["SD of shots to finish", f(t_["sd"], 2), f(t_["emp_sd"], 2)],
        ["Median shots to finish", f(t_["median"], 0), f(t_["emp_median"], 0)],
        ["$P(\\text{all 100 shots needed})$", pct(t_["p100"], 2), pct(t_["emp_p100"], 2)],
        ["Mean shot of the 1st hit", f(t_["first_hit"], 2), f(t_["emp_first_hit"], 2)]]
write_table("tab_sra_theory.tex", "|l|c|c|",
            ["Quantity", "Theory (closed form)", "Observed (SRA, %s games)" % thousands(t_["n"])], rows, "sunglow")

rows = []                                          # integrity of the data
for it in integ:
    lab = [c for c in CONTESTS if c[0] == it["key"]][0]
    rows.append([tag(lab[2], lab[3]), "\\texttt{%s}" % lab[1].replace("_", "\\_"), thousands(it["n"]), pct(it["rule"], 1),
                 pct(it["last"], 1), pct(it["rng"], 1)])
write_table("tab_integrity.tex", "|l|l|c|c|c|c|",
            ["Contest", "File", "Games", "Winner = first to finish", "Last ship at final shot", "Shots in [17,100]"], rows, "aliceblue")


# ----------------------------------------------------------------------------- json + console
def clean(o):
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [clean(v) for v in o]
    if isinstance(o, (np.floating, np.integer)):
        return o.item()
    return o


json.dump(clean(R), open(os.path.join(DATA, "results.json"), "w"), indent=1)
print("OK: tables/ and data/ written")
