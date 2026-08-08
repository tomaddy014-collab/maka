import { Clock, Users, Heart } from "lucide-react";
import Chip from "./Chip.jsx";

export default function RecipeCard({
  recipe,
  isFavorite,
  onToggleFavorite,
  servingsControl,
  animate = false,
}) {
  return (
    <div
      className={`paper-card rounded-xl p-5 shadow-lg ${animate ? "animate-card-confirm" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-2xl leading-tight text-ink">
          {recipe.title}
        </h3>
        {onToggleFavorite && (
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? "Remove from favourites" : "Add to favourites"}
            className="shrink-0 rounded-full p-1.5 text-ink/50 transition-colors hover:bg-ink/5 hover:text-rust cursor-pointer"
          >
            <Heart
              size={22}
              fill={isFavorite ? "currentColor" : "none"}
              className={isFavorite ? "text-rust" : ""}
            />
          </button>
        )}
      </div>

      {recipe.description && (
        <p className="mt-1.5 text-sm text-ink/70">{recipe.description}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-ink/70">
        {recipe.cuisine && <span>{recipe.cuisine}</span>}
        {recipe.time_minutes != null && (
          <span className="flex items-center gap-1">
            <Clock size={13} /> {recipe.time_minutes} min
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users size={13} /> {recipe.servings} serving{recipe.servings === 1 ? "" : "s"}
          {servingsControl}
        </span>
      </div>

      {recipe.dietary_tags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {recipe.dietary_tags.map((tag) => (
            <Chip key={tag}>{tag}</Chip>
          ))}
        </div>
      )}

      <div className="mt-5">
        <h4 className="font-mono text-[11px] uppercase tracking-widest text-ink/50">
          Ingredients
        </h4>
        <ul className="mt-2 space-y-1 text-sm text-ink">
          {recipe.ingredients.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-rust">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5">
        <h4 className="font-mono text-[11px] uppercase tracking-widest text-ink/50">
          Method
        </h4>
        <ol className="mt-2 space-y-2 text-sm text-ink">
          {recipe.steps.map((step, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="font-mono text-ink/40">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
