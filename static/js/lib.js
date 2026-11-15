import { h, render, Fragment, createContext } from "preact";
import { useState, useEffect, useMemo, useRef, useCallback, useContext, useLayoutEffect } from "preact/hooks";
import htm from "/static/vendor/htm.module.js";

export const html = htm.bind(h);
export { h, render, Fragment, createContext, useState, useEffect, useMemo, useRef, useCallback, useContext, useLayoutEffect };
