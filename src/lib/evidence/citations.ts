import { type Citation, citationSchema } from "./types";

/**
 * The bibliography.
 *
 * Every record here was confirmed against PubMed or the publisher's DOI
 * landing page while writing the corresponding concept. `keyFinding` restates
 * the paper's own reported result — not the conclusion we draw from it. Where
 * we go beyond what a paper reported, that reasoning lives in the concept
 * prose and the claim carries a lower evidence grade.
 *
 * Rule for adding entries: if you cannot open the DOI and read the abstract,
 * do not add it. Write the claim without a citation and grade it `mixed`.
 */
const RECORDS = [
  {
    id: "schoenfeld-2017-volume",
    authors: "Schoenfeld, Ogborn & Krieger",
    year: 2017,
    title:
      "Dose-response relationship between weekly resistance training volume and increases in muscle mass: a systematic review and meta-analysis",
    journal: "Journal of Sports Sciences, 35(11), 1073–1082",
    doi: "10.1080/02640414.2016.1210197",
    pmid: "27433992",
    verified: true,
    design: "meta-regression",
    keyFinding:
      "Across 34 treatment groups from 15 studies, each additional weekly set was associated with an effect-size increase of 0.023, corresponding to a 0.37% greater gain in muscle size.",
  },
  {
    id: "pelland-2026-dose-response",
    authors: "Pelland, Remmert, Robinson, Hinson & Zourdos",
    year: 2026,
    title:
      "The resistance training dose response: meta-regressions exploring the effects of weekly volume and frequency on muscle hypertrophy and strength gains",
    journal: "Sports Medicine, 56(2), 481–505",
    doi: "10.1007/s40279-025-02344-w",
    pmid: "41343037",
    verified: true,
    design: "meta-regression",
    keyFinding:
      "Across 67 studies and 2,058 participants, hypertrophy and strength both increased with weekly volume under models showing diminishing returns; counting indirect sets fractionally (1.0 direct, 0.5 indirect) predicted adaptation better than counting them fully or not at all.",
  },
  {
    id: "baz-valle-2022-volume",
    authors: "Baz-Valle, Balsalobre-Fernández, Alix-Fages & Santos-Concejero",
    year: 2022,
    title:
      "A systematic review of the effects of different resistance training volumes on muscle hypertrophy",
    journal: "Journal of Human Kinetics, 81, 199–210",
    doi: "10.2478/hukin-2022-0017",
    verified: true,
    design: "systematic-review",
    keyFinding:
      "In trained individuals, weekly set counts of roughly 12–20 per muscle group were associated with the largest hypertrophy responses across the reviewed trials.",
  },
  {
    id: "wackerhage-2019-stimuli",
    authors: "Wackerhage, Schoenfeld, Hamilton, Lehti & Hulmi",
    year: 2019,
    title:
      "Stimuli and sensors that initiate skeletal muscle hypertrophy following resistance exercise",
    journal: "Journal of Applied Physiology, 126(1), 30–43",
    doi: "10.1152/japplphysiol.00685.2018",
    verified: true,
    design: "narrative-review",
    keyFinding:
      "Mechanical signals are identified as the prime candidate hypertrophy stimulus, acting through mTORC1-mediated increases in muscle protein synthesis; the specific mechanosensor remains incompletely characterised.",
  },
  {
    id: "damas-2016-mps-damage",
    authors: "Damas, Phillips, Libardi et al.",
    year: 2016,
    title:
      "Resistance training-induced changes in integrated myofibrillar protein synthesis are related to hypertrophy only after attenuation of muscle damage",
    journal: "The Journal of Physiology, 594(18), 5209–5222",
    doi: "10.1113/JP272472",
    verified: true,
    design: "mechanistic",
    keyFinding:
      "Early-training increases in myofibrillar protein synthesis correlated with muscle damage rather than with hypertrophy; only once damage had attenuated by week 10 did protein synthesis correlate with actual muscle growth.",
  },
  {
    id: "macdougall-1995-mps-timecourse",
    authors: "MacDougall, Gibala, Tarnopolsky, MacDonald, Interisano & Yarasheski",
    year: 1995,
    title:
      "The time course for elevated muscle protein synthesis following heavy resistance exercise",
    journal: "Canadian Journal of Applied Physiology, 20(4), 480–486",
    doi: "10.1139/h95-038",
    verified: true,
    design: "mechanistic",
    keyFinding:
      "Muscle protein synthesis rose 50% at 4 hours post-exercise and 109% at 24 hours, then fell to within 14% of the control arm by roughly 36 hours.",
  },
  {
    id: "morton-2016-load",
    authors: "Morton, Oikawa, Wavell et al.",
    year: 2016,
    title:
      "Neither load nor systemic hormones determine resistance training-mediated hypertrophy or strength gains in resistance-trained young men",
    journal: "Journal of Applied Physiology, 121(1), 129–138",
    doi: "10.1152/japplphysiol.00154.2016",
    pmid: "27174923",
    verified: true,
    design: "rct",
    keyFinding:
      "Over 12 weeks in 49 trained men, higher-repetition lower-load and lower-repetition higher-load training produced equivalent hypertrophy when sets were taken to volitional failure.",
  },
  {
    id: "schoenfeld-2019-frequency",
    authors: "Schoenfeld, Grgic & Krieger",
    year: 2019,
    title:
      "How many times per week should a muscle be trained to maximize muscle hypertrophy? A systematic review and meta-analysis of studies examining the effects of resistance training frequency",
    journal: "Journal of Sports Sciences, 37(11), 1286–1295",
    doi: "10.1080/02640414.2018.1555906",
    pmid: "30558493",
    verified: true,
    design: "meta-analysis",
    keyFinding:
      "When weekly volume was equated between conditions, training frequency did not significantly influence hypertrophy across 25 studies.",
  },
  {
    id: "schoenfeld-2016-rest",
    authors: "Schoenfeld, Pope, Benik et al.",
    year: 2016,
    title:
      "Longer interset rest periods enhance muscle strength and hypertrophy in resistance-trained men",
    journal: "Journal of Strength and Conditioning Research, 30(7), 1805–1812",
    doi: "10.1519/JSC.0000000000001272",
    verified: true,
    design: "rct",
    keyFinding:
      "Over 8 weeks in 21 trained men, 3-minute inter-set rest produced greater strength and hypertrophy gains than 1-minute rest.",
  },
  {
    id: "refalo-2023-proximity",
    authors: "Refalo, Helms, Trexler, Hamilton & Fyfe",
    year: 2023,
    title:
      "Influence of resistance training proximity-to-failure on skeletal muscle hypertrophy: a systematic review with meta-analysis",
    journal: "Sports Medicine, 53(3), 649–665",
    doi: "10.1007/s40279-022-01784-y",
    verified: true,
    design: "meta-analysis",
    keyFinding:
      "Training to set failure held a trivial advantage over non-failure training for hypertrophy (ES = 0.19, 95% CI 0.00–0.37, p = 0.045).",
  },
  {
    id: "robinson-2024-proximity-dose-response",
    authors: "Robinson, Pelland, Remmert, Refalo, Jukic, Steele & Zourdos",
    year: 2024,
    title:
      "Exploring the dose–response relationship between estimated resistance training proximity to failure, strength gain, and muscle hypertrophy: a series of meta-regressions",
    journal: "Sports Medicine, 54(9), 2209–2231",
    doi: "10.1007/s40279-024-02069-2",
    verified: true,
    design: "meta-regression",
    keyFinding:
      "Hypertrophy showed a modest trend toward greater gains as sets were taken closer to failure, whereas strength gain was largely unaffected by proximity to failure across the range studied.",
  },
  {
    id: "grgic-2022-failure",
    authors: "Grgic, Schoenfeld, Orazem & Sabol",
    year: 2022,
    title:
      "Effects of resistance training performed to repetition failure or non-failure on muscular strength and hypertrophy: a systematic review and meta-analysis",
    journal: "Journal of Sport and Health Science, 11(2), 202–211",
    doi: "10.1016/j.jshs.2021.01.007",
    pmid: "33497853",
    verified: true,
    design: "meta-analysis",
    keyFinding:
      "No significant overall difference between failure and non-failure training for strength (ES = −0.09) or hypertrophy (ES = 0.22); a small significant hypertrophy advantage for failure appeared in the resistance-trained subgroup (ES = 0.15, 95% CI 0.03–0.26).",
  },
  {
    id: "steele-2017-rir-accuracy",
    authors: "Steele, Endres, Fisher, Gentil & Giessing",
    year: 2017,
    title:
      "Ability to predict repetitions to momentary failure is not perfectly accurate, though improves with resistance training experience",
    journal: "PeerJ, 5, e4105",
    doi: "10.7717/peerj.4105",
    pmid: "29204323",
    verified: true,
    design: "crossover",
    keyFinding:
      "Participants under-predicted the number of repetitions they could complete before momentary failure; prediction accuracy improved with resistance training experience but did not become accurate.",
  },
  {
    id: "armes-2020-predict-failure",
    authors: "Armes, Standish-Hunt, Androulakis-Korakakis et al.",
    year: 2020,
    title:
      "“Just one more rep!” — ability to predict proximity to task failure in resistance trained persons",
    journal: "Frontiers in Psychology, 11, 565416",
    doi: "10.3389/fpsyg.2020.565416",
    verified: true,
    design: "crossover",
    keyFinding:
      "Trained participants under-predicted their remaining repetitions by approximately 2.0 reps (95% CI 0.0–4.0) at their self-selected stopping point.",
  },
  {
    id: "zourdos-2016-rpe",
    authors: "Zourdos, Klemp, Dolan et al.",
    year: 2016,
    title:
      "Novel resistance training-specific rating of perceived exertion scale measuring repetitions in reserve",
    journal: "Journal of Strength and Conditioning Research, 30(1), 267–275",
    doi: "10.1519/JSC.0000000000001049",
    pmid: "26049792",
    verified: true,
    design: "crossover",
    keyFinding:
      "Introduced and evaluated an RIR-anchored RPE scale for resistance training; average concentric velocity was inversely related to RPE, and experienced lifters rated a given intensity differently from novices.",
  },
  {
    id: "kassiano-2023-rom",
    authors: "Kassiano, Costa, Nunes, Ribeiro, Schoenfeld & Cyrino",
    year: 2023,
    title:
      "Which ROMs lead to Rome? A systematic review of the effects of range of motion on muscle hypertrophy",
    journal:
      "Journal of Strength and Conditioning Research, 37(5), 1135–1144",
    doi: "10.1519/JSC.0000000000004415",
    verified: true,
    design: "systematic-review",
    keyFinding:
      "Across 11 studies, full ROM and partial ROM performed in the lengthened portion of the range produced greater hypertrophy than partials performed in the shortened portion.",
  },
  {
    id: "kassiano-2023-gastrocnemius",
    authors: "Kassiano, Costa, Kunevaliki et al.",
    year: 2023,
    title:
      "Greater gastrocnemius muscle hypertrophy after partial range of motion training performed at long muscle lengths",
    journal:
      "Journal of Strength and Conditioning Research, 37(9), 1746–1753",
    doi: "10.1519/JSC.0000000000004460",
    verified: true,
    design: "rct",
    keyFinding:
      "Partial plantarflexion performed at long muscle lengths produced greater medial and lateral gastrocnemius hypertrophy than full range-of-motion training.",
  },
  {
    id: "wolf-2025-lengthened-partials",
    authors: "Wolf, Androulakis-Korakakis, Fisher, Schoenfeld & Steele",
    year: 2025,
    title:
      "Lengthened partial repetitions elicit similar muscular adaptations as full range of motion repetitions during resistance training in trained individuals",
    journal: "PeerJ, 13, e18904",
    doi: "10.7717/peerj.18904",
    verified: true,
    design: "rct",
    keyFinding:
      "In a within-participant design with 30 trained participants, lengthened partial repetitions produced adaptations similar to — not greater than — full range-of-motion repetitions.",
  },
] as const satisfies readonly Citation[];

export const CITATIONS: Record<string, Citation> = Object.fromEntries(
  RECORDS.map((record) => [record.id, citationSchema.parse(record)]),
);

export type CitationId = (typeof RECORDS)[number]["id"];

export const ALL_CITATIONS: Citation[] = Object.values(CITATIONS).sort((a, b) =>
  a.authors.localeCompare(b.authors),
);

export function getCitation(id: string): Citation | undefined {
  return CITATIONS[id];
}

/**
 * Resolve citation ids, throwing on anything unknown or unverified.
 *
 * Called at build time from the content loader so a typo or an unvetted
 * reference fails the build rather than rendering as authoritative.
 */
export function resolveCitations(ids: readonly string[]): Citation[] {
  return ids.map((id) => {
    const citation = CITATIONS[id];
    if (!citation) {
      throw new Error(
        `Unknown citation id "${id}". Add a verified record to src/lib/evidence/citations.ts, or drop the reference and grade the claim "mixed".`,
      );
    }
    if (!citation.verified) {
      throw new Error(
        `Citation "${id}" is marked unverified and cannot support a rendered claim.`,
      );
    }
    return citation;
  });
}
