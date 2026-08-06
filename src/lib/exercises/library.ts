import {
  type CheckableExercise,
  assertNoViolations,
  checkExercise,
} from "@/lib/evidence/integrity";

import { MUSCLES } from "./muscles";
import { type Exercise, exerciseSchema } from "./schema";

/**
 * The exercise library.
 *
 * Eight entries, chosen for coverage rather than volume: between them they span
 * all four peak positions, all four failure protocols, all three muscle lengths
 * at peak tension, and they leave the substitution ranker two candidates in
 * each of three muscle groups. A larger library of arbitrary movements would
 * not improve any of that — it would only multiply the number of derivations
 * that have to be defensible.
 *
 * Every entry here is expensive on purpose. Each one carries a derivation for
 * its resistance profile, a rationale for its failure protocol, a rationale for
 * its stimulus-to-fatigue rating, and a coding note wherever the involvement
 * tier is arguable. That is the cost of the claim this app makes, and it is
 * why eight good entries beat thirty thin ones.
 *
 * **On the resistance profiles specifically.** These are *inferences*, not
 * measurements. Nobody here has put a subject on a dynamometer. Each curve is
 * derived from the direction of the resistance, the moment arms it acts
 * through, and how both change across the range — reasoning that is written out
 * in `resistanceProfileDerivation` for every entry so a reader can disagree
 * with it specifically rather than in general. They are graded
 * `mechanical-inference` throughout, and the UI never renders one without its
 * derivation reachable.
 *
 * Sample 0 is the fully lengthened position and sample 10 the fully shortened
 * one, so each array reads in the direction of the concentric. Values are
 * normalised so the peak is exactly 1.0: the shape is the claim, and the
 * magnitude — which would need units nobody has measured — is not.
 */

const RECORDS: readonly Exercise[] = [
  // -------------------------------------------------------------------------
  // Quadriceps
  // -------------------------------------------------------------------------
  {
    id: "back-squat",
    name: "Barbell back squat",

    resistanceProfile: [
      0.92, 0.98, 1.0, 0.97, 0.91, 0.82, 0.71, 0.59, 0.46, 0.33, 0.21,
    ],
    resistanceProfileDerivation:
      "The bar travels vertically, so the knee-extension demand at any depth is the bar's weight times the horizontal distance from the mid-foot to the knee. That distance grows as the shin inclines and peaks just out of the bottom, then collapses toward lockout as the knee stacks under the load. The very deepest position is fractionally easier than the position just above it, because at maximum depth the hips have travelled behind the knees and some of the demand has transferred to the hip extensors — which is why the sticking point of a squat is a hand's width above the hole rather than in it.",
    peakPosition: "stretched",
    muscleLengthAtPeakTension: "lengthened",

    equipment: "barbell",
    unilateral: false,
    axialLoad: "high",
    jointStress: "moderate",
    stabilityDemand: "high",
    failureProtocol: "failure-with-safety-setup",
    failureProtocolRationale:
      "What fails first in a squat is trunk position, not the quadriceps — the spine rounds and the bar drifts forward before the knees genuinely stop extending. That failure is recoverable if the bar has somewhere to land, and is not if it does not. With pins set at depth the lifter can sit into them and walk out; in a rack without them, or with a spotter who is not paying attention, a missed rep loads a flexed spine. The protocol is therefore conditional on the setup rather than on the lifter.",

    sfrRating: 3,
    sfrRationale:
      "A large amount of quadriceps and gluteal stimulus per set, bought with the highest systemic and axial cost in this library. The squat is not a poor choice — it is a movement whose fatigue is charged to the whole organism rather than to the target, so the second and third sets cost more than they would on a machine. Rated in the middle because the stimulus is genuinely excellent and the cost is genuinely real, and a framework that rated it 5 would be describing enthusiasm rather than the trade.",

    setupCues: [
      "Set the pins at the depth you intend to reach, before the working set rather than after the first hard one.",
      "Take the bar out of the rack with two steps, not four — every extra step is unracked load you are paying for and not training.",
      "Brace against the belt or the abdomen before descending, not at the point where the trunk starts to give.",
    ],
    commonErrors: [
      "Letting the hips rise faster than the chest, which converts the set into a stiff-legged good morning and moves the load off the quadriceps and onto the lower back.",
      "Cutting depth as the set fatigues, so the last and hardest reps are the ones training the shortest range — the reverse of what the set was for.",
    ],

    muscles: [
      { muscleId: "quadriceps", involvement: "direct", primeMover: true },
      { muscleId: "gluteus-maximus", involvement: "direct", primeMover: false },
      {
        muscleId: "adductor-magnus",
        involvement: "fractional",
        primeMover: false,
        codingNote:
          "A genuine hip extensor at depth, and meaningfully loaded through a useful range — but the range in which it contributes is the bottom third, not the whole rep, so it counts as half rather than full.",
      },
      {
        muscleId: "erector-spinae",
        involvement: "fractional",
        primeMover: false,
        codingNote:
          "Loaded hard, but largely isometrically — it resists trunk flexion rather than moving through a range. Coded fractional rather than indirect because the load is high enough to drive adaptation even without much excursion, which is the one case where the isometric rule is worth bending.",
      },
      {
        muscleId: "hamstrings",
        involvement: "indirect",
        primeMover: false,
        codingNote:
          "Active as a hip extensor while simultaneously lengthening at the hip and shortening at the knee, so its overall length barely changes. Loaded, but through effectively no excursion. Recorded for fatigue, counted as zero for volume.",
      },
      { muscleId: "soleus", involvement: "indirect", primeMover: false },
    ],
  },

  {
    id: "leg-press",
    name: "Leg press",

    resistanceProfile: [
      0.95, 1.0, 0.98, 0.93, 0.86, 0.77, 0.68, 0.58, 0.48, 0.38, 0.29,
    ],
    resistanceProfileDerivation:
      "The sled travels in a straight line along the rails, so knee-extension demand tracks the angle between the shin and the rail direction. That angle is largest with the knees deeply flexed and shrinks continuously toward extension, giving a curve that falls steadily from a peak near the bottom. Unlike the squat there is no trunk contribution to transfer demand away at depth, so the peak sits slightly deeper than it does in a squat.",
    peakPosition: "stretched",
    muscleLengthAtPeakTension: "mid",

    equipment: "machine",
    unilateral: false,
    axialLoad: "none",
    jointStress: "moderate",
    stabilityDemand: "low",
    failureProtocol: "true-failure-safe",
    failureProtocolRationale:
      "The failure mode is the sled stopping, and the sled stopping is not an emergency — the lifter is seated, supported, and can rotate the safety handles with a hand that is already on them. This is the movement in this library where 0 RIR costs nothing beyond the set itself, which is most of why it earns a high stimulus-to-fatigue rating.",

    sfrRating: 4,
    sfrRationale:
      "Close to the quadriceps stimulus of a squat with almost none of the systemic bill: no axial load, no balance requirement, and no trunk failure mode to terminate the set early. Not rated 5 because the fixed path suits some hip structures better than others, and because the deepest range — where the curve peaks — is the range a lifter is most likely to shorten by letting the pelvis tuck.",

    setupCues: [
      "Set the backrest so the hips stay in contact at the depth you actually use, not at the depth you start from.",
      "Place the feet so the knees track over the toes at the bottom rather than at the top, since the bottom is where the position matters.",
      "Keep a hand on the safety handles for the whole working set, so reaching failure is a decision rather than a scramble.",
    ],
    commonErrors: [
      "Descending until the pelvis tucks under the seat, which loads a flexed lumbar spine with the sled's full weight at the exact point in the range where the demand is highest.",
      "Locking out hard at the top, which parks the knees in full extension under load for no stimulus — the curve shows that position is the easiest part of the rep.",
    ],

    muscles: [
      { muscleId: "quadriceps", involvement: "direct", primeMover: true },
      { muscleId: "gluteus-maximus", involvement: "direct", primeMover: false },
      {
        muscleId: "adductor-magnus",
        involvement: "fractional",
        primeMover: false,
        codingNote:
          "Contributes to hip extension out of the bottom, through a shorter range than in a squat because the trunk is fixed against the backrest.",
      },
      {
        muscleId: "hamstrings",
        involvement: "indirect",
        primeMover: false,
        codingNote:
          "Same two-joint cancellation as the squat: lengthening at the hip, shortening at the knee, net excursion close to zero.",
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Hamstrings
  // -------------------------------------------------------------------------
  {
    id: "romanian-deadlift",
    name: "Romanian deadlift",

    resistanceProfile: [
      0.94, 1.0, 0.99, 0.95, 0.88, 0.79, 0.68, 0.56, 0.43, 0.3, 0.17,
    ],
    resistanceProfileDerivation:
      "The bar hangs vertically from the hands, so hip-extension demand is its weight times the horizontal distance from the hip to the bar. With the knees held in slight fixed flexion, that distance is set almost entirely by trunk angle: it is greatest with the torso near horizontal and falls to nearly nothing at standing, where the bar hangs directly under the hip. The result is a steep, near-linear decline, and the reason the top of an RDL trains almost nothing.",
    peakPosition: "stretched",
    muscleLengthAtPeakTension: "lengthened",

    equipment: "barbell",
    unilateral: false,
    axialLoad: "high",
    jointStress: "low",
    stabilityDemand: "moderate",
    failureProtocol: "never-to-failure",
    failureProtocolRationale:
      "The distinction from the back squat is worth being precise about, because both are heavy barbell hinges and only one of them can be taken close to failure. In a squat the bar can be dumped onto pins. In an RDL there is nowhere for it to go: the failure mode is the lumbar spine losing extension while holding a maximal hip-flexion moment, and it arrives before the hamstrings stop working. Dropping the bar does not help, because the position has already been reached by the time the lifter decides to. Terminate on position, several reps short, every time.",

    sfrRating: 3,
    sfrRationale:
      "The best loaded hamstring stretch available without a machine, and the fatigue cost to match: heavy axial loading, a grip that often fails before the target does, and a spinal-erector bill that is charged against every other hinge in the same week. Rated 3 rather than higher because the stimulus is real but cannot be pushed close to failure, and a movement that has to be stopped early delivers less of its own potential than one that does not.",

    setupCues: [
      "Fix the knee angle at the start and do not change it — an RDL whose knees bend progressively is a deadlift, and it trains something else.",
      "Push the hips back until the bar reaches mid-shin or the hamstrings stop lengthening, whichever happens first, rather than to a fixed depth.",
      "Keep the bar in contact with the thighs on the way down; letting it drift forward increases the hip moment without increasing the stimulus.",
      "Stop the set while the last rep still looked like the first one.",
    ],
    commonErrors: [
      "Chasing depth past the point where the hamstrings stop lengthening, which buys the extra range out of lumbar flexion and loads a rounded spine at the hardest point of the curve.",
      "Squeezing hard at the top, which spends effort in the part of the range the profile shows is nearly unloaded and adds fatigue without stimulus.",
    ],

    muscles: [
      { muscleId: "hamstrings", involvement: "direct", primeMover: true },
      { muscleId: "gluteus-maximus", involvement: "direct", primeMover: false },
      {
        muscleId: "adductor-magnus",
        involvement: "fractional",
        primeMover: false,
        codingNote:
          "A powerful hip extensor from a flexed hip, and the RDL loads exactly that position — coded fractional rather than indirect because its excursion here is real, unlike in the squat's shallower hip range.",
      },
      {
        muscleId: "erector-spinae",
        involvement: "fractional",
        primeMover: false,
        codingNote:
          "Holds trunk extension against the largest hip-flexion moment in this library. Isometric, but at a load high enough to matter, so it is counted at half rather than dropped.",
      },
      {
        muscleId: "forearm-flexors",
        involvement: "indirect",
        primeMover: false,
        codingNote:
          "Grip is frequently the limiting factor, but it is limiting isometrically and through no range at all. Recorded because it explains why a set ended, counted as zero because nothing about it drives hamstring growth.",
      },
      { muscleId: "gastrocnemius", involvement: "indirect", primeMover: false },
    ],
  },

  {
    id: "seated-leg-curl",
    name: "Seated leg curl",

    resistanceProfile: [
      0.9, 0.94, 0.97, 0.99, 1.0, 1.0, 0.99, 0.97, 0.94, 0.9, 0.86,
    ],
    resistanceProfileDerivation:
      "The cam on a seated leg curl exists specifically to flatten this curve — it varies the effective radius of the weight stack's lever as the knee flexes, compensating for the falling moment arm at the pad. We infer a near-even profile from the presence and purpose of that cam rather than from measuring any particular machine, which is the weakest inference in this library and is marked as such: on a machine with a worn or poorly matched cam the real curve will peak somewhere, and this entry would be wrong about where.",
    peakPosition: "even",
    muscleLengthAtPeakTension: "lengthened",

    equipment: "machine",
    unilateral: false,
    axialLoad: "none",
    jointStress: "low",
    stabilityDemand: "low",
    failureProtocol: "true-failure-safe",
    failureProtocolRationale:
      "Nothing about a failed rep here is dangerous: the stack returns to the bottom and the lifter is seated and strapped in. There is no position to lose and nothing to bail out of, which makes this one of the two movements in this library where genuine 0 RIR is available unsupervised.",

    sfrRating: 5,
    sfrRationale:
      "Isolated, safe at failure, no axial or stability tax, and — the part that distinguishes it from a lying curl — the hip stays flexed throughout, so the hamstrings work from a lengthened position across the whole set. Almost all of the fatigue this generates is charged to the target muscle, which is the definition of a high stimulus-to-fatigue ratio. Rated 5 with the caveat that it trains only the knee-flexion function, and a programme built on it alone would leave hip extension untrained.",

    setupCues: [
      "Set the knee axis in line with the machine's pivot before adjusting anything else; everything downstream of that is compensation for getting it wrong.",
      "Bring the lap pad down tight enough that the hips cannot rise, since hip extension is the cheat that shortens this movement.",
      "Let the stack return under control to full knee extension rather than stopping short, because the lengthened position is the part worth having.",
    ],
    commonErrors: [
      "Letting the pelvis rotate and the hips extend as the set gets hard, which reduces hamstring length and quietly turns the last reps into a shorter, easier movement than the first ones.",
      "Stopping the eccentric before full extension, which removes exactly the lengthened range that made the seated version worth choosing over the lying one.",
    ],

    muscles: [
      { muscleId: "hamstrings", involvement: "direct", primeMover: true },
      {
        muscleId: "gastrocnemius",
        involvement: "fractional",
        primeMover: false,
        codingNote:
          "Crosses the knee and assists flexion through a genuine range here, unlike in movements where it is only an ankle stabiliser. This is the distinction the registry keeps it separate from the soleus for.",
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Chest
  // -------------------------------------------------------------------------
  {
    id: "incline-dumbbell-press",
    name: "Incline dumbbell press",

    resistanceProfile: [
      0.96, 1.0, 0.99, 0.95, 0.89, 0.81, 0.71, 0.6, 0.47, 0.33, 0.18,
    ],
    resistanceProfileDerivation:
      "Each dumbbell is pulled straight down by gravity, so the demand at the shoulder is its weight times the horizontal distance from the shoulder joint to the hand. At the bottom the hands are wide and low and that distance is at its greatest; at lockout the dumbbells sit directly above the shoulders and it approaches zero. The curve therefore falls away steeply through the second half — the top of a dumbbell press is nearly free, which is why the position is comfortable to hold and useless to train in.",
    peakPosition: "stretched",
    muscleLengthAtPeakTension: "lengthened",

    equipment: "dumbbell",
    unilateral: false,
    axialLoad: "low",
    jointStress: "moderate",
    stabilityDemand: "moderate",
    failureProtocol: "terminate-at-form-breakdown",
    failureProtocolRationale:
      "The shoulders roll forward off the bench before the pectorals genuinely fail, and pressing from that position is where the shoulder complaints come from. Getting out from under the dumbbells at true failure is survivable but ugly, and the rep before that is already being performed in a position worth avoiding. Stopping when the shoulder blades stop holding position costs one rep and removes both problems.",

    sfrRating: 4,
    sfrRationale:
      "A large loaded stretch on the pectorals with an independent path for each arm, so the stronger side cannot carry the weaker one. The cost is a stability requirement that grows as the set fatigues and a setup that gets harder to enter as the dumbbells get heavier. Rated 4 rather than 5 because the fatigue includes a real shoulder-position component the machine alternatives do not charge.",

    setupCues: [
      "Set the bench between 30 and 45 degrees; past that the anterior deltoid takes over and the movement stops being a chest exercise.",
      "Pin the shoulder blades down and back into the bench before the first rep and treat losing that position as the end of the set.",
      "Lower until the upper arms reach the depth where the chest stops lengthening, rather than until the dumbbells touch anything.",
    ],
    commonErrors: [
      "Pressing the dumbbells together at the top, which adds effort in the range the curve shows is nearly unloaded and does nothing for the range that is.",
      "Letting the elbows flare to ninety degrees at the bottom, which puts the shoulder in its least tolerant position at the exact point where the demand peaks.",
    ],

    muscles: [
      { muscleId: "pectoralis-major", involvement: "direct", primeMover: true },
      {
        muscleId: "anterior-deltoid",
        involvement: "direct",
        primeMover: false,
        codingNote:
          "On an incline this is a target rather than a bystander — the bench angle exists precisely to increase its share, so coding it as anything less than direct would misrepresent why the variation was chosen.",
      },
      {
        muscleId: "triceps-brachii",
        involvement: "fractional",
        primeMover: false,
        codingNote:
          "Extends the elbow through a full range under load, but its own resistance curve here is the inverse of the chest's — hardest where the press is easiest — so it earns half rather than full.",
      },
    ],
  },

  {
    id: "machine-chest-fly",
    name: "Machine chest fly",

    resistanceProfile: [
      0.92, 0.96, 0.99, 1.0, 1.0, 0.99, 0.97, 0.95, 0.92, 0.89, 0.87,
    ],
    resistanceProfileDerivation:
      "The machine's lever rotates about an axis set close to the shoulder, and the pad stays roughly perpendicular to the upper arm through the sweep, so the moment arm at the shoulder changes little between the stretched and shortened positions. That is the entire design intent of a pec deck and it is why the movement feels evenly hard, in contrast to a dumbbell fly, where the same range runs from brutal at the bottom to weightless at the top. Inferred from the linkage geometry rather than measured, and it assumes the user's shoulder is reasonably aligned with the machine's pivot.",
    peakPosition: "even",
    muscleLengthAtPeakTension: "mid",

    equipment: "machine",
    unilateral: false,
    axialLoad: "none",
    jointStress: "low",
    stabilityDemand: "low",
    failureProtocol: "true-failure-safe",
    failureProtocolRationale:
      "The arms are supported through the whole path and a failed rep simply returns the stack. There is no position to lose, nothing to drop, and no joint placed anywhere it cannot leave under its own power.",

    sfrRating: 4,
    sfrRationale:
      "Isolates horizontal adduction with an even profile and no stability or axial cost, so nearly all the fatigue lands on the pectorals. Rated 4 rather than 5 because the fixed path is a fixed path — a lifter whose shoulder does not line up with the pivot gets a different and worse movement than the one described here, and unlike a dumbbell they cannot adjust it.",

    setupCues: [
      "Set the seat so the handles sit level with the mid-chest, since a pad above or below that changes which part of the pectoral is doing the work.",
      "Set the starting width to where the chest is stretched but the shoulder is not being pulled behind the torso.",
      "Keep the elbow angle fixed for the whole set — an elbow that straightens as fatigue arrives turns the fly into a poor press.",
    ],
    commonErrors: [
      "Setting the start position too wide in search of a stretch, which transfers the load from the pectoral onto the front of the shoulder capsule.",
      "Holding the squeeze at full adduction, which adds time under a load the even profile shows is no higher there than anywhere else, at the position where the muscle is shortest.",
    ],

    muscles: [
      { muscleId: "pectoralis-major", involvement: "direct", primeMover: true },
      {
        muscleId: "anterior-deltoid",
        involvement: "fractional",
        primeMover: false,
        codingNote:
          "Assists horizontal adduction throughout, but with the elbow fixed it moves through a smaller arc than it does in any press.",
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Shoulders
  // -------------------------------------------------------------------------
  {
    id: "lateral-raise",
    name: "Dumbbell lateral raise",

    resistanceProfile: [
      0.18, 0.31, 0.45, 0.58, 0.7, 0.8, 0.88, 0.94, 0.98, 1.0, 0.99,
    ],
    resistanceProfileDerivation:
      "The dumbbell hangs vertically and the moment arm at the shoulder is the horizontal distance from the joint to the hand, which is the arm's length times the sine of the abduction angle. At the bottom that is nearly zero and at horizontal it is the whole arm — a difference of more than five to one across the range. This is the clearest case in the library of a movement whose bottom half is almost unloaded, and the reason the exercise is so sensitive to where the lifter stops.",
    peakPosition: "shortened",
    muscleLengthAtPeakTension: "shortened",

    equipment: "dumbbell",
    unilateral: false,
    axialLoad: "none",
    jointStress: "low",
    stabilityDemand: "low",
    failureProtocol: "terminate-at-form-breakdown",
    failureProtocolRationale:
      "True failure here is not dangerous — the arms simply stop rising. What makes the protocol conditional is that the movement has an unusually easy cheat: a small hip drive and a shrug will keep the dumbbells moving long after the lateral deltoid has stopped contributing. The set effectively ends at the point where the trunk starts helping, and continuing past it trains the upper trapezius while feeling like extra work for the shoulder.",

    sfrRating: 5,
    sfrRationale:
      "Almost no systemic cost, no axial load, no joint stress worth recording, and the lateral deltoid has few alternatives that load it directly. The fatigue is local and clears fast, which is what allows the high weekly frequencies this muscle tends to respond to. The caveat is the profile rather than the movement: it loads the shortened position and barely loads the lengthened one, so it is a complement to something else rather than a complete answer.",

    setupCues: [
      "Pick a load you can raise without the hips moving, and treat the first hip assist as the last rep.",
      "Raise to roughly shoulder height and no higher, since past that the upper trapezius takes the work and the deltoid's moment arm has already passed its peak.",
      "Lower under control through the bottom half even though it is nearly unloaded, because releasing it is what turns the next rep into a swing.",
    ],
    commonErrors: [
      "Using enough weight that the movement becomes a hip-driven swing, which shifts the work to the trapezius and makes the load number meaningless as a progression signal.",
      "Stopping the raise well below horizontal, which omits the only part of the range where the profile shows meaningful load.",
    ],

    muscles: [
      { muscleId: "lateral-deltoid", involvement: "direct", primeMover: true },
      {
        muscleId: "anterior-deltoid",
        involvement: "fractional",
        primeMover: false,
        codingNote:
          "Shares abduction whenever the raise drifts even slightly forward of the frontal plane, which in practice it always does.",
      },
      {
        muscleId: "trapezius-upper",
        involvement: "indirect",
        primeMover: false,
        codingNote:
          "Upwardly rotates the scapula throughout, and takes over entirely once the raise passes shoulder height. Coded indirect because in a well-executed set its excursion is small — if it is not small, the set was too heavy.",
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Back
  // -------------------------------------------------------------------------
  {
    id: "chest-supported-row",
    name: "Chest-supported row",

    resistanceProfile: [
      0.24, 0.41, 0.58, 0.73, 0.86, 0.95, 1.0, 0.99, 0.94, 0.85, 0.74,
    ],
    resistanceProfileDerivation:
      "With the torso fixed on an inclined pad, the load hangs vertically and the demand at the shoulder is its weight times the horizontal offset between the shoulder and the hand. At the bottom the arm hangs almost directly below the joint and that offset is small, so the fully lengthened position is the lightest part of the rep. As the elbow travels back the offset grows, peaking as the upper arm approaches perpendicular to the load, then easing slightly as the elbow passes the torso. The result is a mid-range peak — and a stretched position that carries much less tension than the position looks like it should.",
    peakPosition: "mid-range",
    muscleLengthAtPeakTension: "mid",

    equipment: "machine",
    unilateral: false,
    axialLoad: "none",
    jointStress: "low",
    stabilityDemand: "low",
    failureProtocol: "true-failure-safe",
    failureProtocolRationale:
      "The chest support is the entire point: it removes the spinal-erector and hip-hinge component that makes a bent-over row terminate on trunk position rather than on the back musculature. With the torso carried by the pad, a failed rep is a rep that does not finish, and the load returns to the bottom of its path with nothing at stake.",

    sfrRating: 5,
    sfrRationale:
      "The clearest illustration in this library of stimulus-to-fatigue being a property of the setup rather than the movement pattern. A barbell row and this train much the same musculature; this one does not additionally charge the lower back and does not end when the trunk gives out. Rated 5 because nearly all of its fatigue lands on the target, with the honest caveat that grip and biceps still fail before the back does for many lifters.",

    setupCues: [
      "Set the pad height so the handles can be reached without the shoulders shrugging forward at the bottom.",
      "Lead with the elbow rather than the hand, since the elbow's path is what determines the shoulder's moment arm.",
      "Let the shoulder blades protract at the bottom and retract at the top rather than locking them, because the scapular range is part of what the movement trains.",
      "Stop pulling when the elbows reach the torso; past that the shoulder joint gives up range that the back is not moving.",
    ],
    commonErrors: [
      "Pushing the chest off the pad to gain range, which reintroduces exactly the trunk-extension cost the chest support was chosen to remove.",
      "Pulling with a bent wrist and a closed grip, which makes the forearms the limiting factor and ends the set several reps before the back is done.",
    ],

    muscles: [
      {
        muscleId: "latissimus-dorsi",
        involvement: "direct",
        primeMover: true,
      },
      {
        muscleId: "trapezius-middle",
        involvement: "direct",
        primeMover: false,
        codingNote:
          "Retracts the scapula through a genuine range here, which is what separates a chest-supported row from a pulldown — the latter loads the lats with far less scapular retraction.",
      },
      { muscleId: "rhomboids", involvement: "direct", primeMover: false },
      {
        muscleId: "posterior-deltoid",
        involvement: "fractional",
        primeMover: false,
        codingNote:
          "Its share depends heavily on elbow path: a wide, high elbow makes this close to a direct rear-delt movement, a tight elbow makes it incidental. Coded at the midpoint because the cue above specifies neither extreme.",
      },
      {
        muscleId: "biceps-brachii",
        involvement: "fractional",
        primeMover: false,
        codingNote:
          "Flexes the elbow under load through the full range of every rep. Half rather than full because the load is set by what the back can move, not by what the biceps could.",
      },
      {
        muscleId: "forearm-flexors",
        involvement: "indirect",
        primeMover: false,
      },
    ],
  },
];

/**
 * Validates every record once per process, and fails loudly.
 *
 * Two layers, because they catch different things. `exerciseSchema` enforces
 * shape and internal consistency — eleven normalised samples, exactly one prime
 * mover, and the declared `peakPosition` agreeing with where the curve actually
 * peaks. `checkExercise` enforces the evidence contract: every claim-bearing
 * field carries a grade, and a `mechanical-inference` grade carries its
 * derivation.
 *
 * Both throw rather than warn. A malformed exercise that renders is a claim
 * about someone's training presented with a confidence the data does not have.
 */
let cache: readonly Exercise[] | undefined;

export function getAllExercises(): readonly Exercise[] {
  if (cache) return cache;

  const parsed = RECORDS.map((record, index) => {
    const result = exerciseSchema.safeParse(record);
    if (!result.success) {
      throw new Error(
        `Invalid exercise at index ${index} ("${record.id}"):\n${JSON.stringify(result.error.format(), null, 2)}`,
      );
    }
    return result.data;
  });

  assertMusclesResolve(parsed);
  assertNoViolations(parsed.flatMap((exercise) => checkExercise(toCheckable(exercise))));

  cache = [...parsed].sort((a, b) => a.name.localeCompare(b.name));
  return cache;
}

/**
 * Projects an exercise onto the shape the integrity checker understands.
 *
 * Every evidence-bearing field on an exercise is graded `mechanical-inference`,
 * and that is not a shortcut — it is what these claims actually are. Nobody has
 * measured a moment arm here or run a trial on a chest-supported row. The
 * reasoning is written down, inspectable, and wrong in a way a reader can
 * point at, which is the standard that grade exists to describe. The day one of
 * these is backed by a measurement, it gets a citation and a different grade.
 */
function toCheckable(exercise: Exercise): CheckableExercise {
  const primeMover = exercise.muscles.find((entry) => entry.primeMover);

  return {
    id: exercise.id,
    primeMover: {
      grade: "mechanical-inference",
      derivation: exercise.resistanceProfileDerivation,
      muscleId: primeMover?.muscleId,
    },
    muscleInvolvement: {
      grade: "mechanical-inference",
      derivation: exercise.resistanceProfileDerivation,
      entries: exercise.muscles.map((entry) => ({
        muscleId: entry.muscleId,
        involvement: entry.involvement,
      })),
    },
    resistanceProfile: {
      grade: "mechanical-inference",
      derivation: exercise.resistanceProfileDerivation,
      samples: exercise.resistanceProfile,
    },
    failureProtocol: {
      grade: "mechanical-inference",
      derivation: exercise.failureProtocolRationale,
      protocol: exercise.failureProtocol,
    },
    sfr: {
      grade: "mechanical-inference",
      derivation: exercise.sfrRationale,
      rating: exercise.sfrRating,
      reasoning: exercise.sfrRationale,
    },
  };
}

/** Every coded muscle must exist in the registry. */
function assertMusclesResolve(exercises: readonly Exercise[]): void {
  for (const exercise of exercises) {
    for (const entry of exercise.muscles) {
      if (!MUSCLES[entry.muscleId]) {
        throw new Error(
          `Exercise "${exercise.id}" codes unknown muscle "${entry.muscleId}". Add it to src/lib/exercises/muscles.ts.`,
        );
      }
    }
  }
}

export function getExercise(id: string): Exercise | undefined {
  return getAllExercises().find((exercise) => exercise.id === id);
}

/** The muscle an exercise is chosen to train. Guaranteed to exist by schema. */
export function primeMoverOf(exercise: Exercise): string {
  const entry = exercise.muscles.find((muscle) => muscle.primeMover);
  if (!entry) {
    throw new Error(
      `Exercise "${exercise.id}" has no prime mover, which the schema should have prevented.`,
    );
  }
  return entry.muscleId;
}

/** Exercises training a muscle at all, in any involvement tier. */
export function exercisesForMuscle(muscleId: string): readonly Exercise[] {
  return getAllExercises().filter((exercise) =>
    exercise.muscles.some((entry) => entry.muscleId === muscleId),
  );
}

/**
 * Exercises grouped by the peak position of their resistance profile.
 *
 * This is what lets the resistance-profile concept link to real examples of
 * each case rather than naming movements in prose that nothing verifies.
 */
export function exercisesByPeakPosition(): Map<string, readonly Exercise[]> {
  const grouped = new Map<string, Exercise[]>();
  for (const exercise of getAllExercises()) {
    const list = grouped.get(exercise.peakPosition) ?? [];
    list.push(exercise);
    grouped.set(exercise.peakPosition, list);
  }
  return grouped;
}
