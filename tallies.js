function tallies(n) {
    if (n > 5 || n < 0) {
        throw new Error("Invalid Tallies");
    }
    switch (n) {
        case 0:
            return "_";
        case 1:
            return "𝍷";
        case 2:
            return "𝍪";
        case 3:
            return "𝍫";
        case 4:
            return "𝍬";
        case 5:
            return "𝍸";

    }
}