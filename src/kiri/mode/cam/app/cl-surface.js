/** Copyright Stewart Allen <sa@grid.space> -- All Rights Reserved */

import { api } from '../../../app/api.js';
import { env, clearPops } from './init-ui.js';
import { CAM } from './dispatch.js';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export let surfaceOn = false;

let alert, lastWidget;

export function surfaceAdd(ev) {
    if (surfaceOn) {
        return surfaceDone();
    }
    clearPops();
    let { surfaces, follow } = env.poppedRec;
    let { edgeangle } = api.conf.get().controller;
    alert = api.show.alert("analyzing surfaces...", 1000);
    let radians = (follow ?? edgeangle) * DEG2RAD;
    CAM.surface_prep(env.currentIndex * RAD2DEG, () => {
        api.hide.alert(alert);
        alert = api.show.alert("[esc] cancels surface selection");
        for (let [wid, arr] of Object.entries(surfaces)) {
            let widget = api.widgets.forid(wid);
            if (widget && arr.length)
                for (let faceid of arr) {
                    CAM.surface_toggle(widget, faceid, radians, faceids => {
                        // surfaces[widget.id] = faceids;
                    });
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

export function surfaceFindAll() {
    clearPops();
    const { edgeangle } = api.conf.get().controller;
    const radians = (env.poppedRec.follow ?? edgeangle ?? 5) * DEG2RAD;
    alert = api.show.alert("analyzing surfaces...", 1000);
    CAM.surface_prep(env.currentIndex * RAD2DEG, () => {
        CAM.surface_find_all(radians, found => {
            api.hide.alert(alert);
            for (let widget of api.widgets.all()) {
                CAM.surface_clear(widget);
            }
            env.poppedRec.surfaces = {};
            for (let [wid, groups] of Object.entries(found)) {
                let widget = api.widgets.forid(wid);
                if (!widget) continue;
                widget._surfaces = {};
                for (let faces of groups) {
                    if (faces.length) {
                        widget._surfaces[faces[0]] = faces;
                    }
                }
                env.poppedRec.surfaces[wid] = Object.keys(widget._surfaces).map(Number);
                CAM.surface_show(widget);
            }
            if (!Object.values(env.poppedRec.surfaces).some(faces => faces.length)) {
                api.show.alert("no horizontal surfaces found");
            }
        });
    });
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
