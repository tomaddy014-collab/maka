"""Seed the quotes table from JSON-style data — the SAME placeholders as the
frontend. ⚠️ ALL UNVERIFIED: LLMs misattribute real quotes. Verify wording +
author before trusting; flip `verified` to true once you've confirmed them.
"""
from sqlalchemy.orm import Session

from . import models

SEED_QUOTES = [
    ("pre_workout", "The last three reps is what makes the muscle grow."),
    ("pre_workout", "Everybody wants to be a bodybuilder, but nobody wants to lift heavy-ass weight."),
    ("pre_workout", "Step under the bar like you mean it, or don't step under it at all."),
    ("discipline", "Discipline is doing the work on the day you have every excuse not to."),
    ("discipline", "Motivation gets you started; the routine carries you the rest of the way."),
    ("discipline", "Champions are built in the hours nobody is watching."),
    ("nutrition", "You can't out-train a careless kitchen."),
    ("nutrition", "Eat for the body you are building, not the one you have."),
    ("nutrition", "Protein, patience, and consistency — the rest is detail."),
    ("recovery", "The muscle is broken in the gym and built in your sleep."),
    ("recovery", "Rest is not the reward for the work; it is part of the work."),
    ("recovery", "Listen when the body asks for a quiet day — that is wisdom, not weakness."),
    ("perseverance", "Fall down seven times, load the bar an eighth."),
    ("perseverance", "Strength is the residue of showing up after the failures."),
    ("perseverance", "The weight does not care how you feel; pick it up anyway."),
]


def seed_quotes(db: Session) -> None:
    if db.query(models.Quote).count() > 0:
        return
    for category, text in SEED_QUOTES:
        db.add(models.Quote(category=category, text=text,
                            author="PLACEHOLDER — verify", verified=False))
    db.commit()


# A small starter exercise library — extend freely via POST /lifting/exercises.
SEED_EXERCISES = [
    ("Back Squat", "legs"), ("Front Squat", "legs"), ("Deadlift", "back"),
    ("Romanian Deadlift", "hamstrings"), ("Bench Press", "chest"),
    ("Incline Bench Press", "chest"), ("Overhead Press", "shoulders"),
    ("Barbell Row", "back"), ("Pull-up", "back"), ("Lat Pulldown", "back"),
    ("Dumbbell Curl", "biceps"), ("Triceps Pushdown", "triceps"),
    ("Leg Press", "legs"), ("Leg Curl", "hamstrings"), ("Calf Raise", "calves"),
]


def seed_exercises(db: Session) -> None:
    if db.query(models.Exercise).count() > 0:
        return
    for name, group in SEED_EXERCISES:
        db.add(models.Exercise(name=name, muscle_group=group))
    db.commit()
