import { motion } from "framer-motion";
import { Clock, Users, Heart } from "lucide-react";
import Chip from "./Chip.jsx";

export default function RecipeCard({
  recipe,
  isFavorite,
  onToggleFavorite,
  servingsControl,
  animate = false,
}) {
  const Wrapper = animate ? motion.div : "div";
  const motionProps = animate
    ? {
        initial: { opacity: 0, scale: 0.96, y: 8 },
        animate: { opacity: 1, scale: 1, y: 0 },
        transition: { type: "spring", stiffness: 320, damping: 26 },
      }
    : {};

  return (
    <Wrapper
      className="rounded-3xl border border-steel/60 bg-surface-soft p-6"
      {...motionProps}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-2xl font-semibold leading-tight text-ink">
          {recipe.title}
        </h3>
        {onToggleFavorite && (
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? "Remove from favourites" : "Add to favourites"}
            className="shrink-0 rounded-full p-1.5 text-ink-soft transition-colors hover:bg-coral-tint hover:text-coral cursor-pointer"
          >
            <Heart
              size={22}
              fill={isFavorite ? "currentColor" : "none"}
              className={isFavorite ? "text-coral" : ""}
            />
          </button>
        )}
      </div>

      {recipe.description && (
        <p className="mt-1.5 text-sm text-ink-soft">{recipe.description}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-ink-soft">
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
        <h4 className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
          Ingredients
        </h4>
        <ul className="mt-2 space-y-1 text-sm text-ink">
          {recipe.ingredients.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-mint">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5">
        <h4 className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
          Method
        </h4>
        <ol className="mt-2 space-y-2 text-sm text-ink">
          {recipe.steps.map((step, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="font-semibold text-mint">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </Wrapper>
  );
}
