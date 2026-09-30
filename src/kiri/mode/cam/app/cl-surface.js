/** Copyright Stewart Allen <sa@grid.space> -- All Rights Reserved */

import { api } from '../../../app/api.js';
import { env, clearPops } from './init-ui.js';
import { CAM } from './dispatch.js';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export let surfaceOn = false;

let alert, lastWidget;

export function surfaceAdd(ev) {
    return surfaceSelect(false);
}

export function surfaceAll() {
    return surfaceSelect(true);
}

function surfaceSelect(findAll) {
    if (surfaceOn) {
        return surfaceDone();
    }
    clearPops();
    let { surfaces, follow } = env.poppedRec;
    let { edgeangle } = api.conf.get().controller;
    alert = api.show.alert("analyzing surfaces...", 1000);
    let radians = (follow ?? edgeangle) * DEG2RAD;
    CAM.surface_prep(env.currentIndex * RAD2DEG, () => {
        if (!surfaceOn) {
            return;
        }
        api.hide.alert(alert);
        alert = api.show.alert("[esc] cancels surface selection");
        if (findAll) {
            for (let wid of Object.keys(surfaces)) {
                delete surfaces[wid];
            }
            api.widgets.for(widget => {
                CAM.surface_all(widget, radians, found => {
                    if (!surfaceOn) {
                        return;
                    }
                    let selected = widget._surfaces = {};
                    for (let { face, faces } of found) {
                        selected[face] = faces;
                    }
                    CAM.surface_show(widget);
                    surfaces[widget.id] = Object.keys(selected).map(v => parseInt(v));
                });
            });
        } else {
            for (let [wid, arr] of Object.entries(surfaces)) {
                let widget = api.widgets.forid(wid);
                if (widget && arr.length)
                    for (let faceid of arr) {
                        CAM.surface_toggle(widget, faceid, radians, faceids => {
                            // surfaces[widget.id] = faceids;
                        });
                    }
            }
        }
    });
    surfaceOn = env.hoveredOp;
    surfaceOn.classList.add("editing");
    api.feature.on_mouse_up = (obj, ev) => {
        let { face } = obj;
        let min = Math.min(face.a, face.b, face.c);
        let faceid = min / 3;
        let widget = lastWidget = obj.object.widget;
        CAM.surface_toggle(widget, faceid, radians, faceids => {
            surfaces[widget.id] = faceids;
        });
    };
}

export function surfaceDone() {
    if (!(surfaceOn && env.poppedRec && env.poppedRec.surfaces)) {
        return;
    }
    let surfaces = env.poppedRec.surfaces;
    for (let wid of Object.keys(surfaces)) {
        let widget = api.widgets.forid(wid);
        if (widget) {
            CAM.surface_clear(widget);
        } else {
            delete surfaces[wid];
        }
    }
    api.hide.alert(alert);
    api.feature.on_mouse_up = undefined;
    surfaceOn.classList.remove("editing");
    surfaceOn = false;
}
