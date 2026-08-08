import { useCallback, useEffect, useState } from "react";
import AppHeader from "./components/AppHeader.jsx";
import WeekNav from "./components/WeekNav.jsx";
import DaySection from "./components/DaySection.jsx";
import ShoppingListView from "./components/ShoppingListView.jsx";
import PlanningModal from "./components/modals/PlanningModal.jsx";
import RecipeDetailModal from "./components/modals/RecipeDetailModal.jsx";
import RecipeFormModal from "./components/modals/RecipeFormModal.jsx";
import PastWeeksModal from "./components/modals/PastWeeksModal.jsx";
import {
  getPlan as loadPlan,
  setPlan as savePlan,
  getFavorites as loadFavorites,
  setFavorites as saveFavorites,
  getShoppingList as loadShoppingList,
  setShoppingList as saveShoppingList,
  getWeeksIndex as loadWeeksIndex,
  setWeeksIndex as saveWeeksIndex,
} from "./lib/storage.js";
import { DAYS, SLOTS, currentWeekKey, addWeeks } from "./lib/dates.js";
import {
  hydrateRecipe,
  isSameFavorite,
  countPlannedMeals,
  extractPlannedMeals,
  mealsSignature,
} from "./lib/recipeUtils.js";
import { callLLM, parseJSONResponse } from "./lib/llm.js";
import { buildRescalePrompt, buildShoppingListPrompt } from "./lib/prompts.js";
import { makeId } from "./lib/id.js";

export default function App() {
  const [weekKey, setWeekKey] = useState(currentWeekKey);
  const [plan, setPlan] = useState({});
  const [favorites, setFavorites] = useState([]);
  const [weeksIndex, setWeeksIndex] = useState({});
  const [shoppingList, setShoppingListState] = useState(null);
  const [screen, setScreen] = useState("week");
  const [modal, setModal] = useState(null);
  const [shoppingGenerating, setShoppingGenerating] = useState(false);
  const [shoppingError, setShoppingError] = useState("");

  useEffect(() => {
    setFavorites(loadFavorites());
    setWeeksIndex(loadWeeksIndex());
  }, []);

  useEffect(() => {
    setPlan(loadPlan(weekKey));
    setShoppingListState(loadShoppingList(weekKey));
    setShoppingError("");
  }, [weekKey]);

  const persistPlan = useCallback(
    (nextPlan) => {
      setPlan(nextPlan);
      savePlan(weekKey, nextPlan);
      const count = countPlannedMeals(nextPlan);
      setWeeksIndex((idx) => {
        const next = { ...idx, [weekKey]: count };
        saveWeeksIndex(next);
        return next;
      });
    },
    [weekKey],
  );

  function updateFavorites(next) {
    setFavorites(next);
    saveFavorites(next);
  }

  function assignRecipe(day, slot, recipe) {
    const withId = recipe.id ? recipe : hydrateRecipe(recipe);
    const nextPlan = { ...plan, [day]: { ...plan[day], [slot]: withId } };
    persistPlan(nextPlan);
    setModal(null);
  }

  function removeRecipe(day, slot) {
    const nextDay = { ...plan[day] };
    delete nextDay[slot];
    persistPlan({ ...plan, [day]: nextDay });
    setModal(null);
  }

  function toggleFavorite(recipe) {
    const existing = favorites.find((f) => isSameFavorite(f, recipe));
    if (existing) {
      updateFavorites(favorites.filter((f) => f.id !== existing.id));
    } else {
      updateFavorites([...favorites, hydrateRecipe(recipe)]);
    }
  }

  async function rescaleRecipe(day, slot, recipe, targetServings) {
    const prompt = buildRescalePrompt({
      ingredients: recipe.ingredients,
      fromServings: recipe.servings,
      toServings: targetServings,
    });
    const raw = await callLLM(prompt);
    const parsed = parseJSONResponse(raw);
    if (!parsed.ok || !Array.isArray(parsed.data.ingredients)) {
      throw new Error("Could not rescale ingredients.");
    }
    const updated = {
      ...recipe,
      servings: targetServings,
      ingredients: parsed.data.ingredients,
    };
    persistPlan({ ...plan, [day]: { ...plan[day], [slot]: updated } });
    setModal((m) => (m && m.kind === "detail" ? { ...m, recipe: updated } : m));
  }

  function editRecipe(day, slot, formData) {
    const updated = hydrateRecipe(formData);
    persistPlan({ ...plan, [day]: { ...plan[day], [slot]: updated } });
    setModal(null);
  }

  async function generateShoppingList() {
    const meals = extractPlannedMeals(plan);
    if (meals.length === 0) return;
    setShoppingGenerating(true);
    setShoppingError("");
    try {
      const prompt = buildShoppingListPrompt(meals);
      const raw = await callLLM(prompt);
      const parsed = parseJSONResponse(raw);
      if (!parsed.ok || !Array.isArray(parsed.data.categories)) {
        throw new Error("Unexpected shopping list response shape.");
      }
      const previousItems = shoppingList?.items || [];
      const items = [];
      parsed.data.categories.forEach((cat) => {
        (cat.items || []).forEach((item) => {
          const prevMatch = previousItems.find(
            (p) => p.name.toLowerCase() === (item.name || "").toLowerCase(),
          );
          items.push({
            id: makeId("item"),
            category: cat.name,
            name: item.name,
            quantity: item.quantity || "",
            have: prevMatch ? prevMatch.have : false,
          });
        });
      });
      const nextList = {
        items,
        generatedAt: new Date().toISOString(),
        mealsSignature: mealsSignature(plan),
      };
      setShoppingListState(nextList);
      saveShoppingList(weekKey, nextList);
    } catch {
      setShoppingError(
        "Couldn't build the shopping list. Check your connection and try again.",
      );
    } finally {
      setShoppingGenerating(false);
    }
  }

  function toggleHave(itemId) {
    if (!shoppingList) return;
    const nextList = {
      ...shoppingList,
      items: shoppingList.items.map((i) =>
        i.id === itemId ? { ...i, have: !i.have } : i,
      ),
    };
    setShoppingListState(nextList);
    saveShoppingList(weekKey, nextList);
  }

  function repeatWeek(sourceWeekKey) {
    const sourcePlan = loadPlan(sourceWeekKey);
    const clonedPlan = {};
    DAYS.forEach((day) => {
      SLOTS.forEach((slot) => {
        const recipe = sourcePlan?.[day]?.[slot];
        if (recipe) {
          clonedPlan[day] = clonedPlan[day] || {};
          clonedPlan[day][slot] = { ...recipe, id: makeId("recipe") };
        }
      });
    });
    persistPlan(clonedPlan);
    setModal(null);
  }

  const plannedCount = countPlannedMeals(plan);
  const isFavorite = (recipe) =>
    favorites.some((f) => isSameFavorite(f, recipe));

  return (
    <div className="min-h-full bg-charcoal pb-10">
      <AppHeader
        screen={screen}
        onChangeScreen={setScreen}
        onOpenPastWeeks={() => setModal({ kind: "pastWeeks" })}
      />

      {screen === "week" && (
        <>
          <WeekNav
            weekKey={weekKey}
            onPrev={() => setWeekKey((k) => addWeeks(k, -1))}
            onNext={() => setWeekKey((k) => addWeeks(k, 1))}
          />
          <main className="mx-auto max-w-2xl space-y-3 px-4 py-4">
            {DAYS.map((day) => (
              <DaySection
                key={day}
                day={day}
                weekKey={weekKey}
                slots={plan[day]}
                onSlotClick={(slot, recipe) => {
                  if (recipe) setModal({ kind: "detail", day, slot, recipe });
                  else setModal({ kind: "plan", day, slot });
                }}
              />
            ))}
          </main>
        </>
      )}

      {screen === "shopping" && (
        <ShoppingListView
          weekKey={weekKey}
          plannedCount={plannedCount}
          shoppingList={shoppingList}
          generating={shoppingGenerating}
          error={shoppingError}
          stale={
            shoppingList != null &&
            shoppingList.mealsSignature !== mealsSignature(plan)
          }
          onGenerate={generateShoppingList}
          onToggleHave={toggleHave}
        />
      )}

      {modal?.kind === "plan" && (
        <PlanningModal
          day={modal.day}
          slot={modal.slot}
          favorites={favorites}
          onAssign={(recipe) => assignRecipe(modal.day, modal.slot, recipe)}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.kind === "detail" && (
        <RecipeDetailModal
          day={modal.day}
          slot={modal.slot}
          recipe={modal.recipe}
          isFavorite={isFavorite(modal.recipe)}
          onToggleFavorite={() => toggleFavorite(modal.recipe)}
          onRescale={(target) =>
            rescaleRecipe(modal.day, modal.slot, modal.recipe, target)
          }
          onEdit={() =>
            setModal({ kind: "form", day: modal.day, slot: modal.slot, recipe: modal.recipe })
          }
          onReplace={() =>
            setModal({ kind: "plan", day: modal.day, slot: modal.slot })
          }
          onRemove={() => removeRecipe(modal.day, modal.slot)}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.kind === "form" && (
        <RecipeFormModal
          day={modal.day}
          slot={modal.slot}
          recipe={modal.recipe}
          onSubmit={(data) => editRecipe(modal.day, modal.slot, data)}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.kind === "pastWeeks" && (
        <PastWeeksModal
          weeksIndex={weeksIndex}
          viewingWeekKey={weekKey}
          onSelect={repeatWeek}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
