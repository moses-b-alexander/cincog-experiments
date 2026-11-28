"""Rebuild the public tables and SVG figures from the registered study records."""
import argparse
import hashlib
import json
import math
from pathlib import Path
from statistics import mean

import matplotlib
matplotlib.use("Agg")
from matplotlib import pyplot as plt
from matplotlib import colors
from matplotlib.ticker import PercentFormatter
import numpy as np

ARMS = {"whole":"Whole word", "elide_second":"First half", "elide_first":"Last half"}
PRODUCTS = ("Laya", "Kev", "D3", "Tev1", "Nimble")
PALETTE = ("#182e4b","#127970","#ce612e")
plt.rcParams.update({"svg.fonttype":"none","svg.hashsalt":"c4-half-study","font.size":11,
                     "axes.spines.top":False,"axes.spines.right":False,"text.color":"#243548",
                     "axes.labelcolor":"#243548","xtick.color":"#243548","ytick.color":"#243548"})

def save(fig, out, name):
    path=out/name
    fig.savefig(path,format="svg",bbox_inches="tight",metadata={"Date":None})
    plt.close(fig)
    lines=path.read_bytes().splitlines()
    path.write_bytes(b"\n".join(line.rstrip() for line in lines)+b"\n")

def rows_from(product, path):
    record=json.loads(path.read_bytes())
    rows=[]
    for trial in record["trials"]:
        target=trial["result"]["word"]
        for arm in ARMS:
            wire,=trial["receipts"][arm]["C"]
            clue=wire["body"]["state"]["observation"]["fragment"]
            assert wire["status"]==200 and clue=={"whole":target,"elide_second":target[:4],"elide_first":target[4:]}[arm]
            bank=list(wire["body"]["questions"]["decision"]["criteria"])
            response=json.loads(wire["response"])["answers"]["decision"]
            probs=response["probabilities"]
            assert len(bank)==64 and set(probs)==set(bank)
            assert all(math.isfinite(x) and x>=0 for x in probs.values())
            assert math.isclose(sum(probs.values()),1,abs_tol=1e-6)
            selected=wire["selected_option"]
            assert response["choice"]==selected==trial["result"]["arms"][arm]["guess"]
            assert probs[selected]==max(probs.values())
            ordered=sorted(bank,key=lambda w:(-probs[w],w!=selected))
            p=probs[target]
            rows.append({"product":product,"tag":wire["body"]["model"],"trial":trial["id"],
                         "target":target,"arm":arm,"clue":clue,"choice":selected,"correct":selected==target,
                         "rank":ordered.index(target)+1,"target_weight":p,
                         "target_surprisal_bits":-math.log2(p) if p else None,
                         "brier":sum((probs[w]-int(w==target))**2 for w in bank),
                         "probabilities":dict((w,probs[w]) for w in bank)})
    return rows

def curves(rows):
    ranks=[row["rank"] for row in rows]
    cumulative=[np.cumsum(sorted(row["probabilities"].values(),reverse=True)) for row in rows]
    return {"target_cdf":[sum(r<=k for r in ranks)/len(rows) for k in range(1,65)],
            "top_k_mass":np.mean(cumulative,axis=0).tolist()}

def axis_style(ax):
    ax.set_axisbelow(True)
    ax.grid(axis="y",color="#dde5e7")
    ax.tick_params(length=0,pad=6)

def render(records,out):
    out.mkdir(parents=True,exist_ok=True)
    rows=[row for name,path in records.items() for row in rows_from(name,path)]
    products=list(records)
    summaries=[]
    for name in products:
        for arm in ARMS:
            cells=[r for r in rows if r["product"]==name and r["arm"]==arm]
            summaries.append({"product":name,"arm":arm,"n":len(cells),
                "hits":sum(r["correct"] for r in cells),"mean_target_weight":mean(r["target_weight"] for r in cells),
                "mean_brier":mean(r["brier"] for r in cells)})

    fig,ax=plt.subplots(figsize=(6.6,1.2+.66*len(products)))
    values=np.array([c["mean_target_weight"]*100 for c in summaries]).reshape(len(products),3)
    cmap=colors.LinearSegmentedColormap.from_list("indigo-coral",["#222449","#733465","#bd4658","#ef875b","#ffe3c3"])
    ax.imshow(values,cmap=cmap,vmin=0,vmax=100,aspect="auto")
    ax.set_xticks(range(3),ARMS.values());ax.xaxis.tick_top()
    ax.set_yticks(range(len(products)),products)
    for y,line in enumerate(values):
        for x,value in enumerate(line):
            label="<0.1%" if 0<value<.1 else (">99.9%" if 99.9<value<100 else f"{value:.1f}%")
            ax.text(x,y,label,ha="center",va="center",color="white" if value<51 else "#172331",weight="bold")
    for spine in ax.spines.values(): spine.set_visible(False)
    ax.tick_params(length=0,pad=8)
    save(fig,out,"target-heatmap.svg")

    series={}
    for key in ["All"]+products:
        by_arm={}
        for arm in ARMS:
            by_arm[arm]=curves([r for r in rows if (key=="All" or r["product"]==key) and r["arm"]==arm])
        series[key]=by_arm
        for metric,ylabel in [("target_cdf","Targets recovered by rank k"),("top_k_mass","Mean probability retained")]:
            fig,ax=plt.subplots(figsize=(7.6,3.35))
            for (arm,label),color,style in zip(ARMS.items(),PALETTE,["-","--",":"]):
                ax.step(range(65),[0]+by_arm[arm][metric],where="post",label=label,color=color,linestyle=style,linewidth=2.6)
            ax.set(xlim=(0,64),ylim=(0,1.025),xlabel="Number of menu words retained (k)",ylabel=ylabel)
            ax.set_xticks([1,8,16,32,48,64]);ax.yaxis.set_major_formatter(PercentFormatter(1))
            axis_style(ax);ax.legend(ncols=3,loc="lower right",fontsize=9,framealpha=.94)
            save(fig,out,f"{metric}-{key}.svg")

    by_arm=[]
    for arm in ARMS:
        cells=[r for r in rows if r["arm"]==arm]
        bits=[r["target_surprisal_bits"] for r in cells]
        by_arm.append(mean(bits) if None not in bits else None)
    fig,ax=plt.subplots(figsize=(7.6,2.85))
    xmax=max([6]+[v for v in by_arm if v is not None])*1.21
    ax.barh(list(ARMS.values()),[v if v is not None else xmax*.92 for v in by_arm],color=PALETTE,height=.53)
    ax.invert_yaxis();ax.set_xlabel("Mean target surprisal (bits; lower is better)")
    ax.set_xlim(0,xmax)
    ax.axvline(6,color="#707782",linestyle="--",linewidth=1.3)
    for i,v in enumerate(by_arm):
        ax.text((v if v is not None else xmax*.92)+xmax*.01,i,f"{v:.2f}" if v is not None else "∞",va="center")
    fig.tight_layout()
    save(fig,out,"target-bits.svg")
    report={"arms":ARMS,"products":products,"bank":list(rows[0]["probabilities"]),"summary":summaries,
            "mean_target_surprisal_bits":dict(zip(ARMS,by_arm)), "null_surprisal":"positive infinity for target probability zero",
            "rank_ties":"Reported argmax first among tied maxima, then original bank order.",
            "series":series,"decisions":rows,
            "record_sha256":{n:hashlib.sha256(p.read_bytes()).hexdigest() for n,p in records.items()}}
    (out/"results.json").write_text(json.dumps(report,allow_nan=False,indent=1)+"\n",encoding="utf8")
    display={k:report[k] for k in ("arms","products","bank","decisions","summary","mean_target_surprisal_bits")}
    display["curve_points"]={model:{arm:{metric:{str(k):values[k-1] for k in (1,3,5,10,20,32,64)}
                    for metric,values in metrics.items()} for arm,metrics in curves_by_arm.items()}
                    for model,curves_by_arm in series.items()}
    (out/"results.js").write_text("window.C4_PILOT = "+json.dumps(display,allow_nan=False)+";\n",encoding="utf8")
    return report

if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("records",type=Path)
    parser.add_argument("out",type=Path)
    args=parser.parse_args()
    records=({"Kev":args.records} if args.records.is_file()
             else {name:args.records/(name+".json") for name in PRODUCTS})
    render(records,args.out)
