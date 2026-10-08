try {
  var t = localStorage.getItem("basata-theme");
  if (t === "light") {
    document.documentElement.classList.add("light");
  } else {
    document.documentElement.classList.add("dark");
  }
  document.documentElement.setAttribute("data-theme-variant", "classic");
} catch(e) {}