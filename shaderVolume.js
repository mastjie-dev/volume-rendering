

const vertexShader = `
    out vec2 vUv;
    out vec3 vPos;

    void main() {
        vUv = uv;
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
`

const commons = `
    vec3 calcRayDir(vec3 rayOrg, vec3 lookAtPoint, vec2 uv, vec2 resolution) {
        vec3 cd = normalize(lookAtPoint - rayOrg); // camera direction
        vec3 cr = normalize(cross(vec3(0, 1, 0), cd)); // camera right
        vec3 cu = normalize(cross(cd, cr)); // camera up

        vec2 st = uv - .5;
        st.x *= resolution.x / resolution.y;
        vec3 rayDir = mat3(-cr, cu, -cd) * normalize(vec3(st, -1));

        return rayDir;
    }


    // https://gist.github.com/DomNomNom/46bb1ce47f68d255fd5d
    vec2 aabbIntersection(vec3 rayOrigin, vec3 rayDir, vec3 boxMin, vec3 boxMax) {
        vec3 tMin = (boxMin - rayOrigin) / rayDir;
        vec3 tMax = (boxMax - rayOrigin) / rayDir;
        vec3 t1 = min(tMin, tMax);
        vec3 t2 = max(tMin, tMax);
        float tNear = max(max(t1.x, t1.y), t1.z);
        float tFar = min(min(t2.x, t2.y), t2.z);
        return vec2(tNear, tFar);
    }

    float isotropicPhaseFunction() {
        return 1.0 / (4.0 * PI);
    }
`

const fragmentShader = `
    const float PI = 3.14159265359;
    const float STEP = .5;
    const int MAX_STEPS = 128;
    const float SCALE = .01;

    in vec2 vUv;
    in vec3 vPos;

    uniform int example;
    uniform float radius;
    uniform vec3 camPos;
    uniform vec2 resolution;
    uniform vec3 boxMin;
    uniform vec3 boxMax;
    uniform sampler2D blueNoise;
    uniform sampler3D perlinNoise;
    uniform float absorbCoef;
    uniform float scatterCoef;
    uniform float noiseScale;
    uniform float noiseStrength;
    uniform float lightStrength;
    uniform float time;
    uniform float timeScale;
    uniform vec3 lightPosition;
    uniform float noiseMin;
    uniform float noiseMax;
    uniform vec3 colorA;
    uniform vec3 colorB;

    ${commons}

    float scene(vec3 p) {
        float n = texture(perlinNoise, p*noiseScale*SCALE+time*timeScale*SCALE).r;
        float ns = noiseStrength;
        if (example == 2) { ns *= 0.; }
        return length(p) - radius + n * ns;
    }
    
    float lightmarch(vec3 rayOrg, vec3 rayDir, float off) {
        float accDist = 0.;
        float ray = 0.;

        for (int i = 0; i < 32; i++) {
            vec3 samplePos = rayOrg + rayDir * accDist;
            float dist = scene(samplePos);

            if (dist > 0.) break;
            
            // Example A
            if (example == 1) {
                ray += STEP * (absorbCoef + scatterCoef);
                accDist += STEP * off;
            }

            // Example B
            else if (example == 2) {
                float n = texture(perlinNoise, samplePos*noiseScale*SCALE+time*timeScale*SCALE).r;
                n = smoothstep(noiseMin, noiseMax, n);
                ray += STEP * n * (absorbCoef + scatterCoef);
                accDist += STEP * off;
            }            
        }

        return exp(-ray) * lightStrength;
    }

    vec2 raymarch(vec3 rayOrg, vec3 rayDir, float off, vec2 lim) {
        float accDist = lim.x;
        float transmittance = 1.;
        vec3 lightDir = normalize(lightPosition);
        float luminence = 0.;

        for (int i = 0; i < MAX_STEPS; i++) {
            vec3 samplePos = rayOrg + rayDir * accDist;
            float dist = scene(samplePos);
            
            if (accDist > lim.y) break;
            if (dist < 0.) {

                // Volume A
                if (example == 1) {
                    float light = lightmarch(samplePos, lightDir, off);
                    luminence += light *  transmittance * scatterCoef * isotropicPhaseFunction();
                    transmittance *= exp(-STEP*absorbCoef);
                }
                
                // Volume B
                else if (example == 2) {
                    float n = texture(perlinNoise, samplePos*noiseScale*SCALE+time*timeScale*SCALE).r;
                    n = smoothstep(noiseMin, noiseMax, n);

                    vec3 l = vec3(0);
                    vec3 lDir = normalize(l - samplePos);

                    float light = lightmarch(samplePos, lDir, off);
                    luminence += light *  transmittance * scatterCoef * isotropicPhaseFunction();
                    transmittance *= exp(-STEP*absorbCoef*n);
                }
                
            }

            accDist += STEP * off;
        }

        return vec2(luminence, transmittance);
    }

    void main() {

        vec3 rayOrg = camPos;
        vec3 rayDir = calcRayDir(rayOrg, vec3(0.), vUv, resolution);

        vec3 ca = vec3(.823, .96, .996);
        vec3 cb = vec3(0., .611, .764);

        vec4 color = vec4(mix(ca, cb, vUv.y*vUv.y), 1.);
        vec2 intersection = aabbIntersection(rayOrg, rayDir, boxMin, boxMax);
        if (intersection.x < intersection.y) {
            float off = texture(blueNoise, vUv*10.).r;
            vec2 rmv = raymarch(rayOrg, rayDir, fract(off), intersection);

            if (example == 1) {
                color.rgb = mix(color.rgb, vec3(rmv.x), 1. - rmv.y);
            } else {
                color.rgb = mix(color.rgb, mix(colorB, colorA, rmv.x), 1. - rmv.y);
            }

        }

        gl_FragColor = color;
    }
`



export default { vertexShader, fragmentShader }